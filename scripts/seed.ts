// Seeds sample data for the demo: run with `bun run db:seed -- --reset`.
// Everything here is sample data, marked as such in the app.
import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import * as schema from "../src/server/db/schema";
import { hashPassword } from "../src/server/password";
import { dealHand } from "../src/domain/dealing";
import { fitsSlot } from "../src/domain/judge";
import { scoreCorrect, SPOTLIGHT_BONUS } from "../src/domain/scoring";
import { seededRng, shuffled } from "../src/domain/random";
import { pickTeam } from "../src/domain/teams";
import { isLoopHeader, SHARP_EYE_STREAK, type BadgeId } from "../src/domain/badges";

const url = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("Set MIGRATION_DATABASE_URL or DATABASE_URL");
const client = postgres(url, { prepare: false, max: 1, onnotice: () => {} });
const db = drizzle(client, { schema });
const rng = seededRng(20261119);
const pick = <T>(xs: readonly T[]) => xs[Math.floor(rng() * xs.length)];
const DEMO_PASSWORD = "codeline-demo";

type Row = { pseudocode: string; code: string; indent: number; given?: boolean };

const JAVA: Record<string, { title: string; description: string; rows: Row[] }> = {
  findMax: {
    title: "FindMax",
    description: "Find the largest score in an array.",
    rows: [
      { pseudocode: "Define the program FindMax", code: "public class FindMax {", indent: 0, given: true },
      { pseudocode: "Start main", code: "public static void main(String[] args) {", indent: 1, given: true },
      { pseudocode: "Set scores to 72, 85, 64, 91, 78", code: "int[] scores = {72, 85, 64, 91, 78};", indent: 2 },
      { pseudocode: "Set max to the first score", code: "int max = scores[0];", indent: 2 },
      { pseudocode: "For each score after the first", code: "for (int i = 1; i < scores.length; i++) {", indent: 2 },
      { pseudocode: "If this score is greater than max", code: "if (scores[i] > max) {", indent: 3 },
      { pseudocode: "Set max to this score", code: "max = scores[i];", indent: 4 },
      { pseudocode: "End if", code: "}", indent: 3, given: true },
      { pseudocode: "End for", code: "}", indent: 2, given: true },
      { pseudocode: "Print max", code: 'System.out.println("Max: " + max);', indent: 2 },
      { pseudocode: "End main", code: "}", indent: 1, given: true },
      { pseudocode: "End program", code: "}", indent: 0, given: true },
    ],
  },
  sumEvens: {
    title: "SumOfEvens",
    description: "Add up only the even numbers in an array.",
    rows: [
      { pseudocode: "Define the program SumOfEvens", code: "public class SumOfEvens {", indent: 0, given: true },
      { pseudocode: "Start main", code: "public static void main(String[] args) {", indent: 1, given: true },
      { pseudocode: "Set nums to 3, 8, 5, 12, 7, 6", code: "int[] nums = {3, 8, 5, 12, 7, 6};", indent: 2 },
      { pseudocode: "Set sum to 0", code: "int sum = 0;", indent: 2 },
      { pseudocode: "For each number n in nums", code: "for (int n : nums) {", indent: 2 },
      { pseudocode: "If n is even", code: "if (n % 2 == 0) {", indent: 3 },
      { pseudocode: "Add n to sum", code: "sum += n;", indent: 4 },
      { pseudocode: "End if", code: "}", indent: 3, given: true },
      { pseudocode: "End for", code: "}", indent: 2, given: true },
      { pseudocode: "Print sum", code: 'System.out.println("Sum: " + sum);', indent: 2 },
      { pseudocode: "End main", code: "}", indent: 1, given: true },
      { pseudocode: "End program", code: "}", indent: 0, given: true },
    ],
  },
  countVowels: {
    title: "CountVowels",
    description: "Count the vowels in a word.",
    rows: [
      { pseudocode: "Define the program CountVowels", code: "public class CountVowels {", indent: 0, given: true },
      { pseudocode: "Start main", code: "public static void main(String[] args) {", indent: 1, given: true },
      { pseudocode: 'Set word to "programming"', code: 'String word = "programming";', indent: 2 },
      { pseudocode: "Set count to 0", code: "int count = 0;", indent: 2 },
      { pseudocode: "For each position i in word", code: "for (int i = 0; i < word.length(); i++) {", indent: 2 },
      { pseudocode: "Let c be the letter at position i", code: "char c = word.charAt(i);", indent: 3 },
      { pseudocode: "If c is a vowel", code: 'if ("aeiou".indexOf(c) >= 0) {', indent: 3 },
      { pseudocode: "Add 1 to count", code: "count++;", indent: 4 },
      { pseudocode: "End if", code: "}", indent: 3, given: true },
      { pseudocode: "End for", code: "}", indent: 2, given: true },
      { pseudocode: "Print count", code: "System.out.println(count);", indent: 2 },
      { pseudocode: "End main", code: "}", indent: 1, given: true },
      { pseudocode: "End program", code: "}", indent: 0, given: true },
    ],
  },
};

const PYTHON: Record<string, { title: string; description: string; rows: Row[] }> = {
  average: {
    title: "Average",
    description: "Work out the average of a list of scores.",
    rows: [
      { pseudocode: "Set scores to 72, 85, 64, 91", code: "scores = [72, 85, 64, 91]", indent: 0 },
      { pseudocode: "Set total to 0", code: "total = 0", indent: 0 },
      { pseudocode: "For each score s in scores", code: "for s in scores:", indent: 0 },
      { pseudocode: "Add s to total", code: "total += s", indent: 1 },
      { pseudocode: "Divide total by how many scores there are", code: "average = total / len(scores)", indent: 0 },
      { pseudocode: "Print the average", code: "print(average)", indent: 0 },
    ],
  },
  search: {
    title: "LinearSearch",
    description: "Check whether a name is in a list.",
    rows: [
      { pseudocode: 'Set names to "Ann", "Bo", "Cid"', code: 'names = ["Ann", "Bo", "Cid"]', indent: 0 },
      { pseudocode: 'Set target to "Bo"', code: 'target = "Bo"', indent: 0 },
      { pseudocode: "Assume it is not found yet", code: "found = False", indent: 0 },
      { pseudocode: "For each name in names", code: "for name in names:", indent: 0 },
      { pseudocode: "If the name matches the target", code: "if name == target:", indent: 1 },
      { pseudocode: "Mark it as found", code: "found = True", indent: 2 },
      { pseudocode: "Stop looking", code: "break", indent: 2 },
      { pseudocode: "Print whether it was found", code: "print(found)", indent: 0 },
    ],
  },
};

const FIRST = ["Ploy", "Nat", "Bank", "Mint", "Fah", "Ton", "Pim", "Earth", "Beam", "Ice", "Mook", "Pond", "Fern", "Aom", "Kai", "Jay", "Nok", "Tae", "Win", "Bow", "Gun", "Praew", "Oat", "Kaew", "Tarn", "Namwan", "Boss", "Film", "Pang", "View"];
const LAST = ["S.", "K.", "P.", "W.", "C.", "T.", "R.", "N.", "J.", "L.", "B.", "M."];
const NICKS = ["Sprout", "Pebble", "Turnip", "Clover", "Acorn", "Radish", "Bramble", "Fennel", "Mochi", "Puddle", "Hazel", "Basil", "Juniper", "Pumpkin", "Thistle", "Willow", "Maple", "Barley", "Comet", "Owl", "Kite", "Mango", "Pixel", "Nova", "Byte", "Juno", "Echo", "Rook", "Lumi", "Moss"];
const REASONS_RIGHT = [
  "We need the value before we can compare it.",
  "The signpost says this happens inside the loop.",
  "It only updates after the if checks it.",
  "Printing comes last, once the answer is ready.",
  "This sets up the variable the loop uses.",
  "The loop has to start before we look at each item.",
];
const REASONS_WRONG = ["I thought it set things up first.", "Looked like the start of the loop.", "Guessing, it felt like the middle."];

async function chunks<T>(items: T[], size: number, fn: (part: T[]) => Promise<unknown>) {
  for (let i = 0; i < items.length; i += size) await fn(items.slice(i, i + size));
}

async function main() {
  const reset = process.argv.includes("--reset");
  const [{ n }] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(schema.users);
  if (n > 0 && !reset) {
    console.log("The database already has users. Run with --reset to wipe and reseed.");
    return;
  }
  if (reset) {
    await db.execute(sql`truncate table users, courses restart identity cascade`);
  }

  const pw = await hashPassword(DEMO_PASSWORD);
  const [lecturer] = await db
    .insert(schema.users)
    .values({ loginId: "lecturer", name: "Demo Lecturer", nickname: "Lecturer", role: "lecturer", passwordHash: pw })
    .returning();
  const [ta] = await db
    .insert(schema.users)
    .values({ loginId: "ta", name: "Demo Teaching Assistant", nickname: "TA", role: "ta", passwordHash: pw })
    .returning();
  const [student] = await db
    .insert(schema.users)
    .values({ loginId: "student", name: "Demo Student", nickname: "Comet", role: "student", passwordHash: pw, avatar: { color: "#e9b949" } })
    .returning();

  const [java] = await db
    .insert(schema.courses)
    .values({ code: "CSC101", title: "Introduction to Programming (Java)", language: "java", joinCode: "MEADOW", lecturerId: lecturer.id, isSample: true })
    .returning();
  const [python] = await db
    .insert(schema.courses)
    .values({ code: "PY101", title: "Python Basics", language: "python", joinCode: "GROVE7", lecturerId: lecturer.id, isSample: true })
    .returning();
  await db.insert(schema.courseTas).values([{ courseId: java.id, userId: ta.id }, { courseId: python.id, userId: ta.id }]);

  async function addExercise(courseId: string, language: string, ex: { title: string; description: string; rows: Row[] }) {
    const [e] = await db
      .insert(schema.exercises)
      .values({ courseId, title: ex.title, description: ex.description, language, createdBy: lecturer.id })
      .returning();
    const rows = await db
      .insert(schema.exerciseRows)
      .values(ex.rows.map((r, position) => ({ exerciseId: e.id, position, pseudocode: r.pseudocode, code: r.code, indent: r.indent, given: r.given ?? false })))
      .returning();
    return { id: e.id, rows };
  }
  const javaEx = {
    findMax: await addExercise(java.id, "java", JAVA.findMax),
    sumEvens: await addExercise(java.id, "java", JAVA.sumEvens),
    countVowels: await addExercise(java.id, "java", JAVA.countVowels),
  };
  const pyEx = { average: await addExercise(python.id, "python", PYTHON.average), search: await addExercise(python.id, "python", PYTHON.search) };

  async function simulatedStudents(count: number) {
    const values = Array.from({ length: count }, (_, i) => ({
      loginId: `sim-${String(i).padStart(3, "0")}-${Math.floor(rng() * 1e6)}`,
      name: `${pick(FIRST)} ${pick(LAST)}`,
      nickname: `${pick(NICKS)}${Math.floor(rng() * 90 + 10)}`,
      role: "student" as const,
      passwordHash: "!simulated",
      isSimulated: true,
    }));
    return db.insert(schema.users).values(values).returning();
  }
  const javaSims = await simulatedStudents(45);
  const pySims = await simulatedStudents(28);
  await db.insert(schema.enrolments).values([
    ...javaSims.map((u) => ({ courseId: java.id, userId: u.id })),
    ...pySims.map((u) => ({ courseId: python.id, userId: u.id })),
    { courseId: java.id, userId: student.id },
    { courseId: python.id, userId: student.id },
  ]);

  const skill = new Map<string, number>();
  for (const u of [...javaSims, ...pySims]) skill.set(u.id, 0.35 + rng() * 0.5);
  skill.set(student.id, 0.72);
  const xp = new Map<string, number>();
  const badgeRows: { userId: string; badge: BadgeId; earnedAt: Date }[] = [];
  const almanacBest = new Map<string, { userId: string; exerciseId: string; firstAt: Date; bestPoints: number }>();

  type Plan = { courseId: string; at: string; mode: "solo" | "teams"; hand: number; teams: number; rounds: { ex: { id: string; rows: (typeof schema.exerciseRows.$inferSelect)[] }; limit: number }[]; people: string[] };
  const plans: Plan[] = [
    { courseId: java.id, at: "2026-11-05T09:10:00+07:00", mode: "solo", hand: 2, teams: 4, rounds: [{ ex: javaEx.findMax, limit: 180 }, { ex: javaEx.sumEvens, limit: 180 }], people: [student.id, ...javaSims.map((u) => u.id)] },
    { courseId: java.id, at: "2026-11-12T09:10:00+07:00", mode: "teams", hand: 3, teams: 4, rounds: [{ ex: javaEx.countVowels, limit: 240 }, { ex: javaEx.findMax, limit: 180 }], people: [student.id, ...javaSims.map((u) => u.id)] },
    { courseId: java.id, at: "2026-11-17T09:10:00+07:00", mode: "solo", hand: 3, teams: 4, rounds: [{ ex: javaEx.sumEvens, limit: 180 }, { ex: javaEx.countVowels, limit: 240 }, { ex: javaEx.findMax, limit: 150 }], people: [student.id, ...javaSims.map((u) => u.id)] },
    { courseId: python.id, at: "2026-11-10T13:30:00+07:00", mode: "solo", hand: 2, teams: 3, rounds: [{ ex: pyEx.average, limit: 150 }, { ex: pyEx.search, limit: 180 }], people: [student.id, ...pySims.map((u) => u.id)] },
    { courseId: python.id, at: "2026-11-16T13:30:00+07:00", mode: "teams", hand: 2, teams: 3, rounds: [{ ex: pyEx.search, limit: 180 }, { ex: pyEx.average, limit: 150 }], people: [student.id, ...pySims.map((u) => u.id)] },
  ];

  for (const [planIndex, plan] of plans.entries()) {
    const start = new Date(plan.at);
    const people = plan.people.filter((id) => id === student.id || rng() < 0.88);
    const [session] = await db
      .insert(schema.sessions)
      .values({ courseId: plan.courseId, openedBy: lecturer.id, mode: plan.mode, handSize: plan.hand, teamCount: plan.teams, status: "closed", currentRound: plan.rounds.length - 1, createdAt: start, closedAt: new Date(start.getTime() + 40 * 60_000) })
      .returning();
    const teamCounts = Array.from({ length: plan.teams }, () => 0);
    const pState = people.map((userId, seat) => {
      let team: number | null = null;
      if (plan.mode === "teams") {
        team = pickTeam(teamCounts, rng);
        teamCounts[team]++;
      }
      return { userId, seat, team, points: 0, streak: 0 };
    });
    const sessionPlacements: { id?: string; roundId: string; userId: string; correct: boolean; reason: string | null }[] = [];

    let clock = start.getTime() + 3 * 60_000;
    for (const [position, r] of plan.rounds.entries()) {
      const seed = Math.floor(rng() * 1e9);
      const startedAt = new Date(clock);
      const deadline = clock + r.limit * 1000;
      const [round] = await db
        .insert(schema.rounds)
        .values({ sessionId: session.id, position, exerciseId: r.ex.id, timeLimitS: r.limit, status: "revealed", startedAt, deadlineAt: new Date(deadline), endedAt: new Date(deadline), dealSeed: seed })
        .returning();
      const rows = r.ex.rows;
      const dealable = rows.filter((x) => !x.given).map((x) => x.id);
      const byId = new Map(rows.map((x) => [x.id, x]));
      const handRows: (typeof schema.hands.$inferInsert)[] = [];
      const placementRows: (typeof schema.placements.$inferInsert)[] = [];
      let firstCorrectAt = Infinity;
      let firstCorrectUser: string | null = null;

      for (const p of pState) {
        const hand = dealHand(dealable, plan.hand, p.seat, seed);
        const occupied = new Set<string>();
        const s = Math.min(0.95, (skill.get(p.userId) ?? 0.5) + planIndex * 0.04);
        let t = clock + (5 + rng() * 20) * 1000;
        let wrongCount = 0;
        for (const rowId of shuffled(hand, rng)) {
          const snippet = byId.get(rowId)!;
          let placedSlot: string | null = null;
          for (let attempt = 1; attempt <= 6; attempt++) {
            t += (4 + rng() * 22) * 1000;
            if (t >= deadline) break;
            const open = rows.filter((x) => !x.given && !occupied.has(x.id));
            const right = open.filter((x) => fitsSlot(snippet, x));
            const wrong = open.filter((x) => !fitsSlot(snippet, x));
            const goRight = !wrong.length || rng() < Math.min(0.97, s + (attempt - 1) * 0.22);
            if (goRight && right.length) {
              const slot = right.find((x) => x.id === rowId) ?? right[0];
              const { points, streakAfter } = scoreCorrect({ attempt, timeLeft: (deadline - t) / (r.limit * 1000), streakBefore: p.streak });
              p.streak = streakAfter;
              p.points += points;
              xp.set(p.userId, (xp.get(p.userId) ?? 0) + points);
              occupied.add(slot.id);
              placedSlot = slot.id;
              const reason = rng() < 0.25 ? pick(REASONS_RIGHT) : null;
              placementRows.push({ roundId: round.id, userId: p.userId, rowId, slotId: slot.id, correct: true, attempt, points, reason, createdAt: new Date(t) });
              sessionPlacements.push({ roundId: round.id, userId: p.userId, correct: true, reason });
              if (t < firstCorrectAt) {
                firstCorrectAt = t;
                firstCorrectUser = p.userId;
              }
              if (p.streak >= SHARP_EYE_STREAK) badgeRows.push({ userId: p.userId, badge: "sharp-eye", earnedAt: new Date(t) });
              if (attempt === 1 && isLoopHeader(snippet.code)) badgeRows.push({ userId: p.userId, badge: "loop-whisperer", earnedAt: new Date(t) });
              break;
            }
            const near = wrong.filter((x) => Math.abs(x.position - snippet.position) <= 2);
            const target = near.length && rng() < 0.65 ? pick(near) : pick(wrong);
            wrongCount++;
            p.streak = 0;
            const reason = rng() < 0.15 ? pick(REASONS_WRONG) : null;
            placementRows.push({ roundId: round.id, userId: p.userId, rowId, slotId: target.id, correct: false, attempt, points: 0, reason, createdAt: new Date(t) });
          }
          handRows.push({ roundId: round.id, userId: p.userId, rowId, placedSlotId: placedSlot });
        }
        const harvested = handRows.filter((h) => h.userId === p.userId && h.roundId === round.id).every((h) => h.placedSlotId);
        if (harvested) {
          const at = new Date(deadline);
          badgeRows.push({ userId: p.userId, badge: "first-harvest", earnedAt: at });
          if (wrongCount === 0) badgeRows.push({ userId: p.userId, badge: "no-retry-round", earnedAt: at });
          const roundPoints = placementRows.filter((x) => x.userId === p.userId).reduce((a, x) => a + (x.points ?? 0), 0);
          const key = `${p.userId}:${r.ex.id}`;
          const prev = almanacBest.get(key);
          almanacBest.set(key, { userId: p.userId, exerciseId: r.ex.id, firstAt: prev?.firstAt ?? at, bestPoints: Math.max(prev?.bestPoints ?? 0, roundPoints) });
        }
      }
      if (firstCorrectUser) badgeRows.push({ userId: firstCorrectUser, badge: "early-bird", earnedAt: new Date(firstCorrectAt) });
      await chunks(handRows, 400, (part) => db.insert(schema.hands).values(part));
      await chunks(placementRows, 400, (part) => db.insert(schema.placements).values(part));
      clock = deadline + 90_000;
    }

    // One Spotlight per Session, as the lecturer would pin a good reason.
    const reasoned = await db
      .select({ id: schema.placements.id, userId: schema.placements.userId })
      .from(schema.placements)
      .innerJoin(schema.rounds, sql`${schema.rounds.id} = ${schema.placements.roundId}`)
      .where(sql`${schema.rounds.sessionId} = ${session.id} and ${schema.placements.correct} and ${schema.placements.reason} is not null`)
      .limit(20);
    if (reasoned.length) {
      const chosen = pick(reasoned);
      await db.update(schema.placements).set({ spotlighted: true }).where(sql`${schema.placements.id} = ${chosen.id}`);
      const p = pState.find((x) => x.userId === chosen.userId)!;
      p.points += SPOTLIGHT_BONUS;
      xp.set(chosen.userId, (xp.get(chosen.userId) ?? 0) + SPOTLIGHT_BONUS);
      badgeRows.push({ userId: chosen.userId, badge: "spotlighted", earnedAt: new Date(clock) });
    }
    await chunks(
      pState.map((p) => ({ sessionId: session.id, userId: p.userId, team: p.team, seat: p.seat, points: p.points, streak: p.streak, joinedAt: start })),
      400,
      (part) => db.insert(schema.participants).values(part),
    );
    void sessionPlacements;
  }

  // Polyglot: Almanac entries in two languages.
  const langs = new Map<string, Set<string>>();
  const exLang = new Map<string, string>([
    ...Object.values(javaEx).map((e) => [e.id, "java"] as [string, string]),
    ...Object.values(pyEx).map((e) => [e.id, "python"] as [string, string]),
  ]);
  for (const a of almanacBest.values()) {
    const set = langs.get(a.userId) ?? new Set<string>();
    set.add(exLang.get(a.exerciseId)!);
    langs.set(a.userId, set);
  }
  for (const [userId, set] of langs) if (set.size >= 2) badgeRows.push({ userId, badge: "polyglot", earnedAt: new Date("2026-11-16T14:10:00+07:00") });

  await chunks(badgeRows, 400, (part) => db.insert(schema.badges).values(part).onConflictDoNothing());
  await chunks([...almanacBest.values()], 400, (part) => db.insert(schema.almanac).values(part));
  for (const [userId, total] of xp) await db.update(schema.users).set({ xp: total }).where(sql`${schema.users.id} = ${userId}`);

  console.log("Seeded sample data.");
  console.log(`Demo logins (password "${DEMO_PASSWORD}"): lecturer, ta, student`);
  console.log(`Join codes: CSC101 ${java.joinCode}, PY101 ${python.joinCode}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => client.end());
