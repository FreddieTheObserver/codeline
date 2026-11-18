import "server-only";
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { db } from "../db/client";
import { courses, enrolments, exerciseRows, exercises, hands, placements, rounds, sessions, users } from "../db/schema";
import { notFound } from "../http";
import { staffAccess } from "./access";
import { slotStats, studentStats } from "@/domain/aggregate";
import type { CourseDashboard, StudentDetail, TaOverview, Viewer } from "@/lib/api-types";

async function courseData(courseId: string) {
  const roundRows = await db
    .select({ id: rounds.id, exerciseId: rounds.exerciseId, sessionId: rounds.sessionId, startedAt: rounds.startedAt })
    .from(rounds)
    .innerJoin(sessions, eq(sessions.id, rounds.sessionId))
    .where(and(eq(sessions.courseId, courseId), ne(rounds.status, "pending")))
    .orderBy(asc(rounds.startedAt));
  const roundIds = roundRows.map((r) => r.id);
  const allPlacements = roundIds.length
    ? await db
        .select({
          roundId: placements.roundId,
          userId: placements.userId,
          rowId: placements.rowId,
          slotId: placements.slotId,
          correct: placements.correct,
          attempt: placements.attempt,
          points: placements.points,
        })
        .from(placements)
        .where(inArray(placements.roundId, roundIds))
    : [];
  const allHands = roundIds.length
    ? await db
        .select({ roundId: hands.roundId, userId: hands.userId, rowId: hands.rowId, placedSlotId: hands.placedSlotId })
        .from(hands)
        .where(inArray(hands.roundId, roundIds))
    : [];
  return { roundRows, allPlacements, allHands };
}

export async function courseDashboard(viewer: Viewer, courseId: string): Promise<CourseDashboard> {
  const course = await staffAccess(viewer, courseId, "read");
  const { roundRows, allPlacements, allHands } = await courseData(courseId);
  const students = await db
    .select({ userId: users.id, name: users.name, loginId: users.loginId, nickname: users.nickname, isSimulated: users.isSimulated })
    .from(enrolments)
    .innerJoin(users, eq(users.id, enrolments.userId))
    .where(eq(enrolments.courseId, courseId))
    .orderBy(asc(users.name));
  const stats = studentStats(allPlacements);
  const sessionOfRound = new Map(roundRows.map((r) => [r.id, r.sessionId]));
  const sessionOrder = [...new Set(roundRows.map((r) => r.sessionId))];

  const dashboardStudents = students.map((s) => {
    const mine = allPlacements.filter((p) => p.userId === s.userId);
    const perSession = new Map<string, number>();
    for (const p of mine) {
      const sid = sessionOfRound.get(p.roundId)!;
      perSession.set(sid, (perSession.get(sid) ?? 0) + p.points);
    }
    const st = stats.get(s.userId);
    return {
      ...s,
      rounds: st?.rounds ?? 0,
      placements: st?.placements ?? 0,
      firstTryRate: st?.firstTryRate ?? null,
      avgRetries: st?.avgRetries ?? null,
      points: mine.reduce((a, p) => a + p.points, 0),
      trend: sessionOrder.filter((sid) => perSession.has(sid)).slice(-8).map((sid) => perSession.get(sid)!),
    };
  });

  const exerciseIds = [...new Set(roundRows.map((r) => r.exerciseId))];
  const exerciseMeta = exerciseIds.length
    ? await db.select({ id: exercises.id, title: exercises.title }).from(exercises).where(inArray(exercises.id, exerciseIds))
    : [];
  const rows = exerciseIds.length
    ? await db.select().from(exerciseRows).where(inArray(exerciseRows.exerciseId, exerciseIds)).orderBy(asc(exerciseRows.position))
    : [];
  const dashboardExercises = exerciseMeta.map((e) => {
    const rIds = new Set(roundRows.filter((r) => r.exerciseId === e.id).map((r) => r.id));
    return {
      exerciseId: e.id,
      title: e.title,
      rounds: rIds.size,
      steps: slotStats(
        rows.filter((r) => r.exerciseId === e.id),
        allHands.filter((h) => rIds.has(h.roundId)),
        allPlacements.filter((p) => rIds.has(p.roundId)),
      ),
    };
  });

  return {
    course: { id: course.id, code: course.code, title: course.title, language: course.language },
    students: dashboardStudents,
    exercises: dashboardExercises,
  };
}

export async function studentDetail(viewer: Viewer, courseId: string, userId: string): Promise<StudentDetail> {
  const course = await staffAccess(viewer, courseId, "read");
  const [student] = await db
    .select({ userId: users.id, name: users.name, loginId: users.loginId, nickname: users.nickname, isSimulated: users.isSimulated })
    .from(enrolments)
    .innerJoin(users, eq(users.id, enrolments.userId))
    .where(and(eq(enrolments.courseId, courseId), eq(enrolments.userId, userId)));
  if (!student) throw notFound("That student isn't enrolled in this Course.");
  const list = await db
    .select({
      id: placements.id,
      at: placements.createdAt,
      exerciseTitle: exercises.title,
      rowId: placements.rowId,
      slotPosition: exerciseRows.position,
      slotPseudocode: exerciseRows.pseudocode,
      correct: placements.correct,
      attempt: placements.attempt,
      points: placements.points,
      reason: placements.reason,
    })
    .from(placements)
    .innerJoin(rounds, eq(rounds.id, placements.roundId))
    .innerJoin(sessions, eq(sessions.id, rounds.sessionId))
    .innerJoin(exercises, eq(exercises.id, rounds.exerciseId))
    .innerJoin(exerciseRows, eq(exerciseRows.id, placements.slotId))
    .where(and(eq(sessions.courseId, courseId), eq(placements.userId, userId)))
    .orderBy(asc(placements.createdAt));
  const codes = list.length
    ? new Map(
        (
          await db
            .select({ id: exerciseRows.id, code: exerciseRows.code })
            .from(exerciseRows)
            .where(inArray(exerciseRows.id, [...new Set(list.map((l) => l.rowId))]))
        ).map((r) => [r.id, r.code]),
      )
    : new Map<string, string>();
  return {
    student,
    course: { id: course.id, code: course.code, title: course.title },
    placements: list.map(({ rowId, at, slotPosition, ...p }) => ({
      ...p,
      at: at.toISOString(),
      slotPosition: slotPosition + 1,
      snippet: codes.get(rowId) ?? "",
    })),
  };
}

export async function taOverview(viewer: Viewer): Promise<TaOverview> {
  void viewer;
  const all = await db.select().from(courses).orderBy(asc(courses.code));
  const out: TaOverview["courses"] = [];
  for (const c of all) {
    const { roundRows, allPlacements, allHands } = await courseData(c.id);
    const enrolled = await db.$count(enrolments, eq(enrolments.courseId, c.id));
    const sessionCount = await db.$count(sessions, eq(sessions.courseId, c.id));
    const corrects = allPlacements.filter((p) => p.correct);
    const wrongs = allPlacements.length - corrects.length;
    let hardest: TaOverview["courses"][number]["hardest"] = null;
    const exerciseIds = [...new Set(roundRows.map((r) => r.exerciseId))];
    if (exerciseIds.length) {
      const meta = await db.select({ id: exercises.id, title: exercises.title }).from(exercises).where(inArray(exercises.id, exerciseIds));
      const rows = await db.select().from(exerciseRows).where(inArray(exerciseRows.exerciseId, exerciseIds));
      for (const e of meta) {
        const rIds = new Set(roundRows.filter((r) => r.exerciseId === e.id).map((r) => r.id));
        for (const st of slotStats(
          rows.filter((r) => r.exerciseId === e.id),
          allHands.filter((h) => rIds.has(h.roundId)),
          allPlacements.filter((p) => rIds.has(p.roundId)),
        )) {
          if (st.firstTryRate === null || st.heldBy < 3) continue;
          if (!hardest || st.firstTryRate < hardest.firstTryRate) {
            hardest = { exerciseTitle: e.title, position: st.position + 1, pseudocode: st.pseudocode, firstTryRate: st.firstTryRate };
          }
        }
      }
    }
    out.push({
      id: c.id,
      code: c.code,
      title: c.title,
      language: c.language,
      isSample: c.isSample,
      enrolled,
      sessions: sessionCount,
      rounds: roundRows.length,
      placements: corrects.length,
      firstTryRate: corrects.length ? corrects.filter((p) => p.attempt === 1).length / corrects.length : null,
      avgRetries: corrects.length ? wrongs / corrects.length : null,
      hardest,
    });
  }
  return { courses: out };
}

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function taExportCsv(viewer: Viewer): Promise<string> {
  const header = ["course", "login_id", "name", "simulated", "rounds", "placements", "first_try_rate", "avg_retries", "points"];
  const lines = [header.join(",")];
  const all = await db.select().from(courses).orderBy(asc(courses.code));
  for (const c of all) {
    const dash = await courseDashboard({ ...viewer, role: "ta" }, c.id);
    for (const s of dash.students) {
      lines.push(
        [
          c.code,
          s.loginId,
          s.name,
          s.isSimulated ? "yes" : "no",
          s.rounds,
          s.placements,
          s.firstTryRate === null ? "" : s.firstTryRate.toFixed(3),
          s.avgRetries === null ? "" : s.avgRetries.toFixed(2),
          s.points,
        ]
          .map(csvCell)
          .join(","),
      );
    }
  }
  return lines.join("\n") + "\n";
}
