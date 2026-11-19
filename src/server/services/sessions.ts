import "server-only";
import { and, asc, count, desc, eq, gte, inArray, isNull, ne, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { db, type Tx } from "../db/client";
import {
  almanac,
  badges,
  courses,
  enrolments,
  exerciseRows,
  exercises,
  hands,
  participants,
  placements,
  rounds,
  sessions,
  users,
} from "../db/schema";
import { badRequest, conflict, forbidden, notFound } from "../http";
import { pushControl } from "../realtime";
import { requireEnrolled, staffAccess } from "./access";
import { dealHand } from "@/domain/dealing";
import { fitsSlot } from "@/domain/judge";
import { scoreCorrect, SPOTLIGHT_BONUS } from "@/domain/scoring";
import { pickTeam, teamScore, TEAM_COLORS, TEAM_NAMES } from "@/domain/teams";
import { randomSeed, seededRng } from "@/domain/random";
import { BADGE_BY_ID, isLoopHeader, SHARP_EYE_STREAK, THINKER_REASONS, type BadgeId } from "@/domain/badges";
import { levelForXp } from "@/domain/levels";
import { classProgress, slotStats } from "@/domain/aggregate";
import type {
  BadgeEarned,
  ConsoleState,
  ControlAction,
  PlaceResult,
  ProjectorState,
  SlotDto,
  StudentState,
  TeamDto,
  TimerDto,
  Viewer,
} from "@/lib/api-types";

type SessionRow = typeof sessions.$inferSelect;
type RoundRow = typeof rounds.$inferSelect;
type RowRow = typeof exerciseRows.$inferSelect;

export const createSessionInput = z.object({
  courseId: z.string().uuid(),
  mode: z.enum(["solo", "teams"]),
  handSize: z.number().int().min(1).max(20),
  teamCount: z.number().int().min(2).max(6).default(4),
  rounds: z
    .array(z.object({ exerciseId: z.string().uuid(), timeLimitS: z.number().int().min(30).max(1800) }))
    .min(1, "Add at least one Round.")
    .max(8),
});

// ---------- loading and settling ----------

// Serializes the console's ticks and the lecturer's controls for one Session.
async function lockSession(tx: Tx, sessionId: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${sessionId}))`);
}

async function loadSession(tx: Tx, sessionId: string) {
  const [row] = await tx
    .select({ s: sessions, course: courses })
    .from(sessions)
    .innerJoin(courses, eq(courses.id, sessions.courseId))
    .where(eq(sessions.id, sessionId));
  if (!row) throw notFound("Session not found.");
  return row;
}

async function loadRounds(tx: Tx, sessionId: string) {
  return tx
    .select({ r: rounds, title: exercises.title, language: exercises.language })
    .from(rounds)
    .innerJoin(exercises, eq(exercises.id, rounds.exerciseId))
    .where(eq(rounds.sessionId, sessionId))
    .orderBy(asc(rounds.position));
}

async function loadRows(tx: Tx, exerciseId: string): Promise<RowRow[]> {
  return tx.select().from(exerciseRows).where(eq(exerciseRows.exerciseId, exerciseId)).orderBy(asc(exerciseRows.position));
}

async function bump(tx: Tx, sessionId: string): Promise<number> {
  const [row] = await tx
    .update(sessions)
    .set({ version: sql`${sessions.version} + 1` })
    .where(eq(sessions.id, sessionId))
    .returning({ version: sessions.version });
  return row.version;
}

// Rounds end on a stored deadline, so every read and write first brings the
// current Round up to date; nothing depends on a screen staying open.
async function settle(tx: Tx, session: SessionRow, now: Date): Promise<{ round: RoundRow | null; changed: boolean }> {
  if (session.currentRound < 0) return { round: null, changed: false };
  const [round] = await tx
    .select()
    .from(rounds)
    .where(and(eq(rounds.sessionId, session.id), eq(rounds.position, session.currentRound)));
  if (!round) return { round: null, changed: false };
  if (round.status === "running" && round.deadlineAt && round.deadlineAt <= now) {
    const ended = await finishRound(tx, session.id, round, round.deadlineAt);
    return { round: ended ?? round, changed: Boolean(ended) };
  }
  return { round, changed: false };
}

async function finishRound(tx: Tx, sessionId: string, round: RoundRow, endedAt: Date): Promise<RoundRow | null> {
  const [ended] = await tx
    .update(rounds)
    .set({ status: "ended", endedAt, pausedRemainingMs: null })
    .where(and(eq(rounds.id, round.id), inArray(rounds.status, ["running", "paused"])))
    .returning();
  if (!ended) return null;
  await awardRoundEnd(tx, ended);
  await bump(tx, sessionId);
  return ended;
}

async function awardRoundEnd(tx: Tx, round: RoundRow) {
  const perUser = await tx
    .select({
      userId: hands.userId,
      unplaced: sql<number>`count(*) filter (where ${hands.placedSlotId} is null)`.mapWith(Number),
    })
    .from(hands)
    .where(eq(hands.roundId, round.id))
    .groupBy(hands.userId);
  const harvested = perUser.filter((u) => u.unplaced === 0).map((u) => u.userId);
  if (!harvested.length) return;
  const stats = await tx
    .select({
      userId: placements.userId,
      wrong: sql<number>`count(*) filter (where ${placements.correct} = false)`.mapWith(Number),
      points: sql<number>`coalesce(sum(${placements.points}), 0)`.mapWith(Number),
    })
    .from(placements)
    .where(and(eq(placements.roundId, round.id), inArray(placements.userId, harvested)))
    .groupBy(placements.userId);
  const statOf = new Map(stats.map((s) => [s.userId, s]));
  const earned: { userId: string; badge: BadgeId; earnedAt: Date }[] = [];
  const at = round.endedAt ?? new Date();
  for (const userId of harvested) {
    earned.push({ userId, badge: "first-harvest", earnedAt: at });
    if ((statOf.get(userId)?.wrong ?? 0) === 0) earned.push({ userId, badge: "no-retry-round", earnedAt: at });
  }
  await tx.insert(badges).values(earned).onConflictDoNothing();
  await tx
    .insert(almanac)
    .values(harvested.map((userId) => ({ userId, exerciseId: round.exerciseId, firstAt: at, bestPoints: statOf.get(userId)?.points ?? 0 })))
    .onConflictDoUpdate({
      target: [almanac.userId, almanac.exerciseId],
      set: { bestPoints: sql`greatest(${almanac.bestPoints}, excluded.best_points)` },
    });
  const polyglots = await tx
    .select({ userId: almanac.userId })
    .from(almanac)
    .innerJoin(exercises, eq(exercises.id, almanac.exerciseId))
    .where(inArray(almanac.userId, harvested))
    .groupBy(almanac.userId)
    .having(sql`count(distinct ${exercises.language}) >= 2`);
  if (polyglots.length) {
    await tx
      .insert(badges)
      .values(polyglots.map((p) => ({ userId: p.userId, badge: "polyglot" as BadgeId, earnedAt: at })))
      .onConflictDoNothing();
  }
}

function timerOf(round: RoundRow): TimerDto {
  return {
    status: round.status,
    deadlineAt: round.deadlineAt?.toISOString() ?? null,
    pausedRemainingMs: round.pausedRemainingMs,
    timeLimitS: round.timeLimitS,
  };
}

// ---------- creating and joining ----------

export async function createSession(viewer: Viewer, input: z.infer<typeof createSessionInput>): Promise<string> {
  await staffAccess(viewer, input.courseId, "run");
  const [open] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(and(eq(sessions.courseId, input.courseId), ne(sessions.status, "closed")))
    .limit(1);
  if (open) throw conflict("This Course already has an open Session. Close it from its console first.");
  const exerciseIds = [...new Set(input.rounds.map((r) => r.exerciseId))];
  const found = await db
    .select({ id: exercises.id, dealable: sql<number>`count(*) filter (where ${exerciseRows.given} = false)`.mapWith(Number) })
    .from(exercises)
    .leftJoin(exerciseRows, eq(exerciseRows.exerciseId, exercises.id))
    .where(and(inArray(exercises.id, exerciseIds), eq(exercises.courseId, input.courseId)))
    .groupBy(exercises.id);
  if (found.length !== exerciseIds.length) throw badRequest("Every Round needs an Exercise from this Course.");
  if (found.some((f) => f.dealable === 0)) throw badRequest("One of the Exercises has nothing to deal.");
  return db.transaction(async (tx) => {
    const [s] = await tx
      .insert(sessions)
      .values({ courseId: input.courseId, openedBy: viewer.id, mode: input.mode, handSize: input.handSize, teamCount: input.teamCount })
      .returning({ id: sessions.id });
    await tx.insert(rounds).values(
      input.rounds.map((r, position) => ({ sessionId: s.id, position, exerciseId: r.exerciseId, timeLimitS: r.timeLimitS })),
    );
    return s.id;
  });
}

async function addParticipant(tx: Tx, session: SessionRow, userId: string, round: RoundRow | null, rng = Math.random) {
  const [existing] = await tx
    .select()
    .from(participants)
    .where(and(eq(participants.sessionId, session.id), eq(participants.userId, userId)));
  if (existing) return existing;
  const [{ seat }] = await tx
    .select({ seat: sql<number>`coalesce(max(${participants.seat}), -1) + 1`.mapWith(Number) })
    .from(participants)
    .where(eq(participants.sessionId, session.id));
  let team: number | null = null;
  if (session.mode === "teams") {
    const counts = Array.from({ length: session.teamCount }, () => 0);
    const rows = await tx
      .select({ team: participants.team, n: count() })
      .from(participants)
      .where(eq(participants.sessionId, session.id))
      .groupBy(participants.team);
    for (const r of rows) if (r.team !== null && r.team < counts.length) counts[r.team] = r.n;
    team = pickTeam(counts, rng);
  }
  const [created] = await tx
    .insert(participants)
    .values({ sessionId: session.id, userId, seat, team })
    .onConflictDoNothing()
    .returning();
  if (created && round && (round.status === "running" || round.status === "paused")) {
    await dealTo(tx, session, round, [{ userId, seat }]);
  }
  return created;
}

async function dealTo(tx: Tx, session: SessionRow, round: RoundRow, seats: { userId: string; seat: number }[]) {
  if (!seats.length) return;
  const dealable = (await loadRows(tx, round.exerciseId)).filter((r) => !r.given).map((r) => r.id);
  const values = seats.flatMap(({ userId, seat }) =>
    dealHand(dealable, session.handSize, seat, round.dealSeed).map((rowId) => ({ roundId: round.id, userId, rowId })),
  );
  if (values.length) await tx.insert(hands).values(values).onConflictDoNothing();
}

export async function joinSession(viewer: Viewer, sessionId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const { s, course } = await loadSession(tx, sessionId);
    await requireEnrolled(viewer, course.id);
    if (s.status === "closed") throw conflict("This Session has closed.");
    const { round } = await settle(tx, s, new Date());
    await addParticipant(tx, s, viewer.id, round);
  });
}

// ---------- lecturer controls ----------

async function startRound(tx: Tx, session: SessionRow, round: RoundRow, now: Date) {
  const seed = randomSeed();
  const deadline = new Date(now.getTime() + round.timeLimitS * 1000);
  const [started] = await tx
    .update(rounds)
    .set({ status: "running", startedAt: now, deadlineAt: deadline, dealSeed: seed, pausedRemainingMs: null })
    .where(and(eq(rounds.id, round.id), eq(rounds.status, "pending")))
    .returning();
  if (!started) throw conflict("That Round has already started.");
  await tx.execute(sql`
    update participants p set rank_at_round_start = r.rank
    from (select user_id, rank() over (order by points desc) as rank from participants where session_id = ${session.id}) r
    where p.session_id = ${session.id} and p.user_id = r.user_id`);
  await tx.update(sessions).set({ status: "live", currentRound: round.position }).where(eq(sessions.id, session.id));
  const seats = await tx
    .select({ userId: participants.userId, seat: participants.seat })
    .from(participants)
    .where(eq(participants.sessionId, session.id));
  await dealTo(tx, session, started, seats);
}

export async function controlSession(viewer: Viewer, sessionId: string, action: ControlAction): Promise<void> {
  const version = await db.transaction(async (tx) => {
    await lockSession(tx, sessionId);
    const { s, course } = await loadSession(tx, sessionId);
    await staffAccess(viewer, course.id, "run");
    if (s.status === "closed") throw conflict("This Session has closed.");
    const now = new Date();
    const { round } = await settle(tx, s, now);
    const all = await tx.select().from(rounds).where(eq(rounds.sessionId, sessionId)).orderBy(asc(rounds.position));
    switch (action) {
      case "start":
      case "next": {
        if (round && (round.status === "running" || round.status === "paused")) throw conflict("End the current Round first.");
        const next = all.find((r) => r.position === s.currentRound + 1);
        if (!next) throw conflict("That was the last Round. Close the Session to finish.");
        await startRound(tx, s, next, now);
        break;
      }
      case "pause": {
        if (round?.status !== "running" || !round.deadlineAt) throw conflict("No Round is running.");
        await tx
          .update(rounds)
          .set({ status: "paused", pausedRemainingMs: Math.max(0, round.deadlineAt.getTime() - now.getTime()) })
          .where(eq(rounds.id, round.id));
        break;
      }
      case "resume": {
        if (round?.status !== "paused") throw conflict("The Round isn't paused.");
        await tx
          .update(rounds)
          .set({ status: "running", deadlineAt: new Date(now.getTime() + (round.pausedRemainingMs ?? 0)), pausedRemainingMs: null })
          .where(eq(rounds.id, round.id));
        break;
      }
      case "end": {
        if (!round || (round.status !== "running" && round.status !== "paused")) throw conflict("No Round is running.");
        await finishRound(tx, s.id, round, now);
        break;
      }
      case "reveal": {
        if (!round || round.status === "pending") throw conflict("Start a Round first.");
        if (round.status === "running" || round.status === "paused") await finishRound(tx, s.id, round, now);
        await tx.update(rounds).set({ status: "revealed" }).where(eq(rounds.id, round.id));
        break;
      }
      case "close": {
        if (round && (round.status === "running" || round.status === "paused")) await finishRound(tx, s.id, round, now);
        await tx.update(sessions).set({ status: "closed", closedAt: now }).where(eq(sessions.id, s.id));
        break;
      }
    }
    return bump(tx, s.id);
  });
  pushControl({ sessionId, version });
}

// ---------- placing ----------

type PlaceCtx = { session: SessionRow; round: RoundRow; rows: Map<string, RowRow>; now: Date };

async function grantBadges(tx: Tx, userId: string, ids: BadgeId[]): Promise<BadgeEarned[]> {
  if (!ids.length) return [];
  const inserted = await tx
    .insert(badges)
    .values(ids.map((badge) => ({ userId, badge })))
    .onConflictDoNothing()
    .returning({ badge: badges.badge });
  return inserted.map((b) => {
    const def = BADGE_BY_ID[b.badge as BadgeId];
    return { id: def.id, name: def.name, description: def.description, icon: def.icon };
  });
}

async function placeInternal(
  tx: Tx,
  ctx: PlaceCtx,
  userId: string,
  cardId: string,
  slotId: string,
  reason?: string,
): Promise<PlaceResult & { roundEnded: boolean }> {
  const { round, rows, now } = ctx;
  if (round.status === "paused") throw conflict("The Round is paused.");
  if (round.status !== "running") throw conflict("This Round is over.");
  const [card] = await tx
    .select()
    .from(hands)
    .where(and(eq(hands.cardId, cardId), eq(hands.userId, userId), eq(hands.roundId, round.id)));
  if (!card) throw notFound("That seed isn't in your pouch.");
  if (card.placedSlotId) throw conflict("You've already planted that seed.");
  const slot = rows.get(slotId);
  if (!slot) throw badRequest("That plot isn't part of this Exercise.");
  if (slot.given) throw badRequest("That plot is already planted for everyone.");
  const [taken] = await tx
    .select({ id: hands.cardId })
    .from(hands)
    .where(and(eq(hands.roundId, round.id), eq(hands.userId, userId), eq(hands.placedSlotId, slotId)));
  if (taken) throw conflict("That plot already holds one of your seeds.");

  const [{ tries }] = await tx
    .select({ tries: count() })
    .from(placements)
    .where(and(eq(placements.roundId, round.id), eq(placements.userId, userId), eq(placements.rowId, card.rowId)));
  const attempt = tries + 1;
  const snippet = rows.get(card.rowId)!;
  const correct = fitsSlot(snippet, slot);
  const [me] = await tx
    .select()
    .from(participants)
    .where(and(eq(participants.sessionId, ctx.session.id), eq(participants.userId, userId)));
  if (!me) throw forbidden("Join the Session first.");

  let points = 0;
  let streak = 0;
  const badgeIds: BadgeId[] = [];
  if (correct) {
    // Claim the card before scoring: of two concurrent taps on one card, only one finds it unplaced.
    const [claimed] = await tx
      .update(hands)
      .set({ placedSlotId: slotId })
      .where(and(eq(hands.cardId, cardId), isNull(hands.placedSlotId)))
      .returning({ cardId: hands.cardId });
    if (!claimed) throw conflict("You've already planted that seed.");
    const timeLeft = round.deadlineAt ? (round.deadlineAt.getTime() - now.getTime()) / (round.timeLimitS * 1000) : 0;
    const scored = scoreCorrect({ attempt, timeLeft, streakBefore: me.streak });
    points = scored.points;
    streak = scored.streakAfter;
    const [{ before }] = await tx
      .select({ before: count() })
      .from(placements)
      .where(and(eq(placements.roundId, round.id), eq(placements.correct, true)));
    if (before === 0) badgeIds.push("early-bird");
    if (streak >= SHARP_EYE_STREAK) badgeIds.push("sharp-eye");
    if (attempt === 1 && isLoopHeader(snippet.code)) badgeIds.push("loop-whisperer");
    await tx.update(users).set({ xp: sql`${users.xp} + ${points}` }).where(eq(users.id, userId));
  }
  await tx
    .update(participants)
    .set({ points: sql`${participants.points} + ${points}`, streak })
    .where(and(eq(participants.sessionId, ctx.session.id), eq(participants.userId, userId)));
  const [placement] = await tx
    .insert(placements)
    .values({
      roundId: round.id,
      userId,
      rowId: card.rowId,
      slotId,
      correct,
      attempt,
      points,
      reason: reason?.trim() || null,
      createdAt: now,
    })
    .returning({ id: placements.id });

  let handDone = false;
  let roundEnded = false;
  if (correct) {
    const [{ left }] = await tx
      .select({ left: count() })
      .from(hands)
      .where(and(eq(hands.roundId, round.id), eq(hands.userId, userId), isNull(hands.placedSlotId)));
    handDone = left === 0;
    if (handDone) {
      const [{ anyLeft }] = await tx
        .select({ anyLeft: count() })
        .from(hands)
        .where(and(eq(hands.roundId, round.id), isNull(hands.placedSlotId)));
      if (anyLeft === 0) roundEnded = Boolean(await finishRound(tx, ctx.session.id, round, now));
    }
  }
  const earned = await grantBadges(tx, userId, badgeIds);
  return { correct, points, attempt, streak, placementId: placement.id, badges: earned, handDone, roundEnded };
}

async function placeContext(tx: Tx, sessionId: string): Promise<PlaceCtx & { course: typeof courses.$inferSelect }> {
  const { s, course } = await loadSession(tx, sessionId);
  const now = new Date();
  const { round } = await settle(tx, s, now);
  if (!round) throw conflict("No Round has started yet.");
  const rows = new Map((await loadRows(tx, round.exerciseId)).map((r) => [r.id, r]));
  return { session: s, round, rows, now, course };
}

export async function placeCard(viewer: Viewer, sessionId: string, cardId: string, slotId: string): Promise<PlaceResult> {
  const result = await db.transaction(async (tx) => {
    const ctx = await placeContext(tx, sessionId);
    return placeInternal(tx, ctx, viewer.id, cardId, slotId);
  });
  if (result.roundEnded) {
    const [s] = await db.select({ version: sessions.version }).from(sessions).where(eq(sessions.id, sessionId));
    pushControl({ sessionId, version: s.version });
  }
  const { roundEnded, ...rest } = result;
  void roundEnded;
  return rest;
}

export async function giveReason(viewer: Viewer, placementId: string, reason: string): Promise<BadgeEarned[]> {
  return db.transaction(async (tx) => {
    const [p] = await tx.select().from(placements).where(eq(placements.id, placementId));
    if (!p || p.userId !== viewer.id) throw notFound("Placement not found.");
    await tx.update(placements).set({ reason: reason.trim().slice(0, 200) || null }).where(eq(placements.id, placementId));
    const [{ n }] = await tx
      .select({ n: count() })
      .from(placements)
      .where(and(eq(placements.userId, viewer.id), sql`${placements.reason} is not null`));
    return n >= THINKER_REASONS ? grantBadges(tx, viewer.id, ["thinker"]) : [];
  });
}

export async function spotlightPlacement(viewer: Viewer, sessionId: string, placementId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const { course } = await loadSession(tx, sessionId);
    await staffAccess(viewer, course.id, "run");
    const [p] = await tx
      .select({ p: placements })
      .from(placements)
      .innerJoin(rounds, eq(rounds.id, placements.roundId))
      .where(and(eq(placements.id, placementId), eq(rounds.sessionId, sessionId)));
    if (!p) throw notFound("Placement not found.");
    if (!p.p.reason) throw badRequest("Only a Placement with a reason can be spotlighted.");
    if (p.p.spotlighted) return;
    await tx.update(placements).set({ spotlighted: true }).where(eq(placements.id, placementId));
    await tx
      .update(participants)
      .set({ points: sql`${participants.points} + ${SPOTLIGHT_BONUS}` })
      .where(and(eq(participants.sessionId, sessionId), eq(participants.userId, p.p.userId)));
    await tx.update(users).set({ xp: sql`${users.xp} + ${SPOTLIGHT_BONUS}` }).where(eq(users.id, p.p.userId));
    await grantBadges(tx, p.p.userId, ["spotlighted"]);
  });
}

export async function renameParticipant(viewer: Viewer, sessionId: string, userId: string, nickname: string): Promise<void> {
  const { course } = await db.transaction((tx) => loadSession(tx, sessionId));
  await staffAccess(viewer, course.id, "run");
  const [p] = await db
    .select()
    .from(participants)
    .where(and(eq(participants.sessionId, sessionId), eq(participants.userId, userId)));
  if (!p) throw notFound("That student isn't in this Session.");
  await db.update(users).set({ nickname: nickname.trim().slice(0, 20) || "Gardener" }).where(eq(users.id, userId));
}

// ---------- views ----------

type Standing = { userId: string; nickname: string; points: number; team: number | null; rankAtRoundStart: number | null; xp: number; avatar: Record<string, string | undefined>; name: string; loginId: string; isSimulated: boolean; streak: number };

async function standings(tx: Tx, sessionId: string): Promise<(Standing & { rank: number })[]> {
  const rows = await tx
    .select({
      userId: participants.userId,
      nickname: users.nickname,
      name: users.name,
      loginId: users.loginId,
      isSimulated: users.isSimulated,
      points: participants.points,
      team: participants.team,
      streak: participants.streak,
      rankAtRoundStart: participants.rankAtRoundStart,
      xp: users.xp,
      avatar: users.avatar,
    })
    .from(participants)
    .innerJoin(users, eq(users.id, participants.userId))
    .where(eq(participants.sessionId, sessionId))
    .orderBy(desc(participants.points), asc(participants.seat));
  let rank = 0;
  let last = Number.NaN;
  return rows.map((r, i) => {
    if (r.points !== last) {
      rank = i + 1;
      last = r.points;
    }
    return { ...r, rank };
  });
}

function teamsOf(session: SessionRow, list: Standing[]): TeamDto[] {
  if (session.mode !== "teams") return [];
  return Array.from({ length: session.teamCount }, (_, index) => {
    const members = list.filter((p) => p.team === index);
    return {
      index,
      name: TEAM_NAMES[index % TEAM_NAMES.length],
      color: TEAM_COLORS[index % TEAM_COLORS.length],
      score: teamScore(members.map((m) => m.points)),
      members: members.length,
    };
  }).sort((a, b) => b.score - a.score);
}

async function readView<T>(sessionId: string, fn: (tx: Tx, s: SessionRow, course: typeof courses.$inferSelect, round: RoundRow | null, now: Date) => Promise<T>): Promise<T> {
  let pushVersion: number | null = null;
  const out = await db.transaction(async (tx) => {
    const { s, course } = await loadSession(tx, sessionId);
    const now = new Date();
    const { round, changed } = await settle(tx, s, now);
    if (changed) {
      const [v] = await tx.select({ version: sessions.version }).from(sessions).where(eq(sessions.id, sessionId));
      pushVersion = v.version;
    }
    const fresh = changed ? (await loadSession(tx, sessionId)).s : s;
    return fn(tx, fresh, course, round, now);
  });
  if (pushVersion !== null) pushControl({ sessionId, version: pushVersion });
  return out;
}

export async function studentState(viewer: Viewer, sessionId: string): Promise<StudentState> {
  return readView(sessionId, async (tx, s, course, round, now) => {
    await requireEnrolled(viewer, course.id);
    const all = await loadRounds(tx, sessionId);
    const list = await standings(tx, sessionId);
    const me = list.find((p) => p.userId === viewer.id);
    const teams = teamsOf(s, list);
    const myTeam = me && me.team !== null ? (teams.find((t) => t.index === me.team) ?? null) : null;

    let roundView: StudentState["round"] = null;
    let result: StudentState["result"] = null;
    if (round && me) {
      const rows = await loadRows(tx, round.exerciseId);
      const myHand = await tx
        .select()
        .from(hands)
        .where(and(eq(hands.roundId, round.id), eq(hands.userId, viewer.id)));
      const revealed = round.status === "revealed";
      const placedIn = new Set(myHand.flatMap((h) => (h.placedSlotId ? [h.placedSlotId] : [])));
      const codeOf = new Map(rows.map((r) => [r.id, r.code]));
      const meta = all.find((a) => a.r.id === round.id)!;
      roundView = {
        id: round.id,
        position: round.position,
        timer: timerOf(round),
        exercise: { title: meta.title, language: meta.language },
        slots: rows.map<SlotDto>((r) => ({
          id: r.id,
          position: r.position,
          pseudocode: r.pseudocode,
          indent: r.indent,
          given: r.given,
          code: r.given || revealed || placedIn.has(r.id) ? r.code : null,
        })),
        hand: myHand.map((h) => ({ cardId: h.cardId, code: codeOf.get(h.rowId) ?? "", placedSlotId: h.placedSlotId })),
        revealed,
      };
      if ((round.status === "ended" || round.status === "revealed") && myHand.length) {
        const [{ pts }] = await tx
          .select({ pts: sql<number>`coalesce(sum(${placements.points}), 0)`.mapWith(Number) })
          .from(placements)
          .where(and(eq(placements.roundId, round.id), eq(placements.userId, viewer.id)));
        const mine = await tx
          .select({ badge: badges.badge })
          .from(badges)
          .where(and(eq(badges.userId, viewer.id), gte(badges.earnedAt, round.startedAt ?? now)));
        result = {
          roundPoints: pts,
          rank: me.rank,
          previousRank: me.rankAtRoundStart,
          harvested: myHand.every((h) => h.placedSlotId),
          badges: mine.map((b) => {
            const def = BADGE_BY_ID[b.badge as BadgeId];
            return { id: def.id, name: def.name, description: def.description, icon: def.icon };
          }),
        };
      }
    }
    return {
      serverNow: now.toISOString(),
      session: {
        id: s.id,
        status: s.status,
        mode: s.mode,
        courseCode: course.code,
        courseTitle: course.title,
        roundIndex: s.currentRound,
        roundCount: all.length,
        version: s.version,
      },
      me: {
        joined: Boolean(me),
        nickname: me?.nickname ?? viewer.nickname,
        points: me?.points ?? 0,
        rank: me?.rank ?? null,
        of: list.length,
        team: myTeam,
        streak: me?.streak ?? 0,
      },
      round: roundView,
      result,
      teams,
    };
  });
}

async function classSlots(tx: Tx, round: RoundRow) {
  const rows = await loadRows(tx, round.exerciseId);
  const roundHands = await tx
    .select({ userId: hands.userId, rowId: hands.rowId, placedSlotId: hands.placedSlotId })
    .from(hands)
    .where(eq(hands.roundId, round.id));
  const roundPlacements = await tx
    .select({ id: placements.id, userId: placements.userId, rowId: placements.rowId, slotId: placements.slotId, correct: placements.correct, attempt: placements.attempt })
    .from(placements)
    .where(eq(placements.roundId, round.id));
  return { rows, stats: slotStats(rows, roundHands, roundPlacements), progress: classProgress(roundHands), roundHands, roundPlacements };
}

export async function projectorState(viewer: Viewer, sessionId: string): Promise<ProjectorState> {
  return readView(sessionId, async (tx, s, course, round, now) => {
    await staffAccess(viewer, course.id, "run");
    const all = await loadRounds(tx, sessionId);
    const list = await standings(tx, sessionId);
    let roundView: ProjectorState["round"] = null;
    let progress = { placed: 0, dealt: 0 };
    let feed: ProjectorState["feed"] = [];
    if (round) {
      const { rows, stats, progress: p } = await classSlots(tx, round);
      progress = p;
      const revealed = round.status === "revealed";
      const statOf = new Map(stats.map((st) => [st.slotId, st]));
      const meta = all.find((a) => a.r.id === round.id)!;
      roundView = {
        timer: timerOf(round),
        exercise: { title: meta.title, language: meta.language },
        revealed,
        slots: rows.map((r) => {
          const st = statOf.get(r.id);
          return {
            id: r.id,
            position: r.position,
            pseudocode: r.pseudocode,
            indent: r.indent,
            given: r.given,
            code: r.given || revealed ? r.code : null,
            heldBy: st?.heldBy ?? 0,
            placedCorrect: st?.placedCorrect ?? 0,
            firstTryRate: st?.firstTryRate ?? null,
          };
        }),
      };
      const recent = await tx
        .select({ nickname: users.nickname, correct: placements.correct, at: placements.createdAt })
        .from(placements)
        .innerJoin(users, eq(users.id, placements.userId))
        .where(eq(placements.roundId, round.id))
        .orderBy(desc(placements.createdAt))
        .limit(6);
      feed = recent.map((f) => ({ nickname: f.nickname, kind: f.correct ? "sprout" : "wilt", at: f.at.toISOString() }));
    }
    const [spot] = await tx
      .select({ nickname: users.nickname, reason: placements.reason, position: exerciseRows.position, pseudocode: exerciseRows.pseudocode })
      .from(placements)
      .innerJoin(rounds, eq(rounds.id, placements.roundId))
      .innerJoin(users, eq(users.id, placements.userId))
      .innerJoin(exerciseRows, eq(exerciseRows.id, placements.slotId))
      .where(and(eq(rounds.sessionId, sessionId), eq(placements.spotlighted, true)))
      .orderBy(desc(placements.createdAt))
      .limit(1);
    return {
      serverNow: now.toISOString(),
      session: {
        id: s.id,
        status: s.status,
        mode: s.mode,
        courseCode: course.code,
        courseTitle: course.title,
        joinCode: course.joinCode,
        roundIndex: s.currentRound,
        roundCount: all.length,
        participants: list.length,
      },
      round: roundView,
      progress,
      top: list.slice(0, 5).map((p) => ({ nickname: p.nickname, points: p.points, level: levelForXp(p.xp), avatar: p.avatar })),
      teams: teamsOf(s, list),
      spotlight: spot?.reason ? { nickname: spot.nickname, reason: spot.reason, step: spot.position + 1, pseudocode: spot.pseudocode } : null,
      feed,
      lobbyNames: list.slice(0, 60).map((p) => p.nickname),
    };
  });
}

export async function consoleState(viewer: Viewer, sessionId: string): Promise<ConsoleState> {
  return readView(sessionId, async (tx, s, course, round, now) => {
    await staffAccess(viewer, course.id, "run");
    const all = await loadRounds(tx, sessionId);
    const list = await standings(tx, sessionId);
    let stats: ConsoleState["stats"] = [];
    let progress = { placed: 0, dealt: 0 };
    let feed: ConsoleState["placements"] = [];
    const perUser = new Map<string, { placed: number; hand: number; wrong: number }>();
    if (round) {
      const view = await classSlots(tx, round);
      stats = view.stats;
      progress = view.progress;
      for (const h of view.roundHands) {
        const u = perUser.get(h.userId) ?? { placed: 0, hand: 0, wrong: 0 };
        u.hand++;
        if (h.placedSlotId) u.placed++;
        perUser.set(h.userId, u);
      }
      for (const p of view.roundPlacements) {
        if (p.correct) continue;
        const u = perUser.get(p.userId) ?? { placed: 0, hand: 0, wrong: 0 };
        u.wrong++;
        perUser.set(p.userId, u);
      }
      const rowById = new Map(view.rows.map((r) => [r.id, r]));
      const recent = await tx
        .select({ p: placements, name: users.name, nickname: users.nickname })
        .from(placements)
        .innerJoin(users, eq(users.id, placements.userId))
        .where(eq(placements.roundId, round.id))
        .orderBy(desc(placements.createdAt))
        .limit(60);
      feed = recent.map(({ p, name, nickname }) => ({
        id: p.id,
        userId: p.userId,
        name,
        nickname,
        snippet: rowById.get(p.rowId)?.code ?? "",
        slotPosition: (rowById.get(p.slotId)?.position ?? 0) + 1,
        slotPseudocode: rowById.get(p.slotId)?.pseudocode ?? "",
        correct: p.correct,
        attempt: p.attempt,
        reason: p.reason,
        spotlighted: p.spotlighted,
        at: p.createdAt.toISOString(),
      }));
    }
    return {
      serverNow: now.toISOString(),
      session: {
        id: s.id,
        status: s.status,
        mode: s.mode,
        courseCode: course.code,
        courseTitle: course.title,
        joinCode: course.joinCode,
        roundIndex: s.currentRound,
        roundCount: all.length,
        participants: list.length,
        courseId: course.id,
        handSize: s.handSize,
        teamCount: s.teamCount,
        rounds: all.map((a) => ({ position: a.r.position, exerciseTitle: a.title, timeLimitS: a.r.timeLimitS, status: a.r.status })),
      },
      round: round
        ? {
            position: round.position,
            timer: timerOf(round),
            exercise: { title: all.find((a) => a.r.id === round.id)!.title, language: all.find((a) => a.r.id === round.id)!.language },
          }
        : null,
      participants: list.map((p) => ({
        userId: p.userId,
        name: p.name,
        loginId: p.loginId,
        nickname: p.nickname,
        isSimulated: p.isSimulated,
        team: p.team,
        points: p.points,
        placed: perUser.get(p.userId)?.placed ?? 0,
        hand: perUser.get(p.userId)?.hand ?? 0,
        wrong: perUser.get(p.userId)?.wrong ?? 0,
      })),
      placements: feed,
      stats,
      progress,
    };
  });
}

// ---------- simulated classmates (a demo tool) ----------

const SIM_FIRST = ["Ploy", "Nat", "Bank", "Mint", "Fah", "Ton", "Pim", "Earth", "Beam", "Ice", "Mook", "Pond", "Fern", "Aom", "Kai", "Jay", "Nok", "Tae", "Win", "Bow"];
const SIM_LAST = ["S.", "K.", "P.", "W.", "C.", "T.", "R.", "N.", "J.", "L."];
const SIM_NICKS = ["Sprout", "Pebble", "Turnip", "Clover", "Acorn", "Radish", "Bramble", "Fennel", "Mochi", "Puddle", "Hazel", "Basil", "Juniper", "Pumpkin", "Thistle", "Willow", "Maple", "Barley", "Comet", "Owl7"];
const SIM_REASONS = [
  "The value has to exist before we compare it.",
  "This matches the wording on the signpost.",
  "The loop needs to start before the check inside it.",
  "It updates the answer only after the if.",
  "Print comes last, after everything is worked out.",
  "This sets up the variable we use later.",
];

function skillOf(userId: string): number {
  let h = 0;
  for (const ch of userId) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return 0.45 + (Math.abs(h) % 1000) / 1000 * 0.45;
}

export async function addSimulatedStudents(viewer: Viewer, sessionId: string, howMany: number): Promise<number> {
  const n = Math.max(1, Math.min(howMany, 60));
  return db.transaction(async (tx) => {
    const { s, course } = await loadSession(tx, sessionId);
    await staffAccess(viewer, course.id, "run");
    if (s.status === "closed") throw conflict("This Session has closed.");
    const { round } = await settle(tx, s, new Date());
    const free = await tx
      .select({ id: users.id })
      .from(enrolments)
      .innerJoin(users, eq(users.id, enrolments.userId))
      .where(
        and(
          eq(enrolments.courseId, course.id),
          eq(users.isSimulated, true),
          sql`${users.id} not in (select user_id from participants where session_id = ${sessionId})`,
        ),
      )
      .limit(n);
    const ids = free.map((f) => f.id);
    const rng = seededRng(randomSeed());
    while (ids.length < n) {
      const first = SIM_FIRST[Math.floor(rng() * SIM_FIRST.length)];
      const [u] = await tx
        .insert(users)
        .values({
          loginId: `sim-${randomBytes(4).toString("hex")}`,
          name: `${first} ${SIM_LAST[Math.floor(rng() * SIM_LAST.length)]}`,
          nickname: `${SIM_NICKS[Math.floor(rng() * SIM_NICKS.length)]}${Math.floor(rng() * 90 + 10)}`,
          role: "student",
          passwordHash: "!simulated",
          isSimulated: true,
        })
        .returning({ id: users.id });
      await tx.insert(enrolments).values({ courseId: course.id, userId: u.id });
      ids.push(u.id);
    }
    for (const id of ids) await addParticipant(tx, s, id, round, rng);
    return ids.length;
  });
}

// Called by the console about once a second: settles the Round and lets the
// simulated students make a few Placements through the same rules as everyone else.
export async function tickSession(viewer: Viewer, sessionId: string, runBots = true): Promise<{ placed: number }> {
  let pushVersion: number | null = null;
  const placed = await db.transaction(async (tx) => {
    await lockSession(tx, sessionId);
    const { s, course } = await loadSession(tx, sessionId);
    await staffAccess(viewer, course.id, "run");
    const now = new Date();
    const { round, changed } = await settle(tx, s, now);
    if (changed) pushVersion = (await loadSession(tx, sessionId)).s.version;
    if (!runBots || !round || round.status !== "running") return 0;
    const pending = await tx
      .select({ cardId: hands.cardId, userId: hands.userId, rowId: hands.rowId })
      .from(hands)
      .innerJoin(users, eq(users.id, hands.userId))
      .where(and(eq(hands.roundId, round.id), isNull(hands.placedSlotId), eq(users.isSimulated, true)));
    if (!pending.length) return 0;
    const rows = new Map((await loadRows(tx, round.exerciseId)).map((r) => [r.id, r]));
    const ctx: PlaceCtx = { session: s, round, rows, now };
    const rng = seededRng(randomSeed());
    const byUser = new Map<string, typeof pending>();
    for (const p of pending) byUser.set(p.userId, [...(byUser.get(p.userId) ?? []), p]);
    let made = 0;
    for (const [userId, cards] of byUser) {
      if (made >= 25 || rng() > 0.16) continue;
      const card = cards[Math.floor(rng() * cards.length)];
      const occupied = new Set(
        (
          await tx
            .select({ slot: hands.placedSlotId })
            .from(hands)
            .where(and(eq(hands.roundId, round.id), eq(hands.userId, userId)))
        ).flatMap((h) => (h.slot ? [h.slot] : [])),
      );
      const open = [...rows.values()].filter((r) => !r.given && !occupied.has(r.id));
      const snippet = rows.get(card.rowId)!;
      const right = open.filter((r) => fitsSlot(snippet, r));
      const wrong = open.filter((r) => !fitsSlot(snippet, r));
      const [{ tries }] = await tx
        .select({ tries: count() })
        .from(placements)
        .where(and(eq(placements.roundId, round.id), eq(placements.userId, userId), eq(placements.rowId, card.rowId)));
      const goRight = !wrong.length || rng() < Math.min(0.95, skillOf(userId) + tries * 0.2);
      const pool = goRight && right.length ? right : wrong;
      if (!pool.length) continue;
      const target = pool[Math.floor(rng() * pool.length)];
      const reason = rng() < 0.3 ? SIM_REASONS[Math.floor(rng() * SIM_REASONS.length)] : undefined;
      const result = await placeInternal(tx, ctx, userId, card.cardId, target.id, reason);
      made++;
      if (result.roundEnded) {
        pushVersion = (await loadSession(tx, sessionId)).s.version;
        break;
      }
    }
    return made;
  });
  if (pushVersion !== null) pushControl({ sessionId, version: pushVersion });
  return { placed };
}
