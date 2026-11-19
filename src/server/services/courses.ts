import "server-only";
import { and, count, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { randomInt } from "node:crypto";
import { db } from "../db/client";
import {
  almanac,
  badges,
  courseTas,
  courses,
  enrolments,
  exerciseRows,
  exercises,
  participants,
  rounds,
  sessions,
  users,
} from "../db/schema";
import { conflict, notFound } from "../http";
import { staffAccess } from "./access";
import { levelProgress } from "@/domain/levels";
import type { CourseCard, CourseDetail, StaffCourseCard, StudentHome, Viewer } from "@/lib/api-types";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function newJoinCode(): string {
  return Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
}

async function liveSessions(courseIds: string[]) {
  if (!courseIds.length) return new Map<string, { sessionId: string; status: "lobby" | "live" }>();
  const rows = await db
    .select({ id: sessions.id, courseId: sessions.courseId, status: sessions.status })
    .from(sessions)
    .where(and(inArray(sessions.courseId, courseIds), ne(sessions.status, "closed")))
    .orderBy(desc(sessions.createdAt));
  const map = new Map<string, { sessionId: string; status: "lobby" | "live" }>();
  for (const r of rows) {
    if (!map.has(r.courseId)) map.set(r.courseId, { sessionId: r.id, status: r.status as "lobby" | "live" });
  }
  return map;
}

export async function studentHome(viewer: Viewer): Promise<StudentHome> {
  const [me] = await db.select().from(users).where(eq(users.id, viewer.id));
  const enrolled = await db
    .select({ id: courses.id, code: courses.code, title: courses.title, language: courses.language, isSample: courses.isSample })
    .from(enrolments)
    .innerJoin(courses, eq(courses.id, enrolments.courseId))
    .where(eq(enrolments.userId, viewer.id))
    .orderBy(courses.code);
  const live = await liveSessions(enrolled.map((c) => c.id));
  const [{ n: badgeCount }] = await db.select({ n: count() }).from(badges).where(eq(badges.userId, viewer.id));
  const [{ n: almanacCount }] = await db.select({ n: count() }).from(almanac).where(eq(almanac.userId, viewer.id));
  const progress = levelProgress(me.xp);
  return {
    viewer,
    level: { level: progress.level, xp: me.xp, into: progress.into, span: progress.span },
    avatar: me.avatar,
    badgeCount,
    almanacCount,
    courses: enrolled.map<CourseCard>((c) => ({ ...c, live: live.get(c.id) ?? null })),
  };
}

export async function joinCourse(viewer: Viewer, code: string): Promise<CourseCard> {
  const [course] = await db
    .select()
    .from(courses)
    .where(eq(courses.joinCode, code.trim().toUpperCase()))
    .limit(1);
  if (!course) throw notFound("No Course has that join code. Check the code on the projector.");
  await db.insert(enrolments).values({ courseId: course.id, userId: viewer.id }).onConflictDoNothing();
  const live = await liveSessions([course.id]);
  return {
    id: course.id,
    code: course.code,
    title: course.title,
    language: course.language,
    isSample: course.isSample,
    live: live.get(course.id) ?? null,
  };
}

async function staffCards(viewer: Viewer, courseRows: (typeof courses.$inferSelect)[]): Promise<StaffCourseCard[]> {
  const ids = courseRows.map((c) => c.id);
  if (!ids.length) return [];
  const live = await liveSessions(ids);
  const enrolledCounts = await db
    .select({ courseId: enrolments.courseId, n: count() })
    .from(enrolments)
    .innerJoin(users, eq(users.id, enrolments.userId))
    .where(inArray(enrolments.courseId, ids))
    .groupBy(enrolments.courseId);
  const exerciseCounts = await db
    .select({ courseId: exercises.courseId, n: count() })
    .from(exercises)
    .where(inArray(exercises.courseId, ids))
    .groupBy(exercises.courseId);
  const assisted =
    viewer.role === "ta"
      ? new Set(
          (await db.select({ id: courseTas.courseId }).from(courseTas).where(eq(courseTas.userId, viewer.id))).map((r) => r.id),
        )
      : new Set<string>();
  return courseRows.map((c) => ({
    id: c.id,
    code: c.code,
    title: c.title,
    language: c.language,
    isSample: c.isSample,
    joinCode: c.joinCode,
    live: live.get(c.id) ?? null,
    enrolled: enrolledCounts.find((e) => e.courseId === c.id)?.n ?? 0,
    exercises: exerciseCounts.find((e) => e.courseId === c.id)?.n ?? 0,
    canEdit: viewer.role === "lecturer" && c.lecturerId === viewer.id,
    canRun: (viewer.role === "lecturer" && c.lecturerId === viewer.id) || assisted.has(c.id),
  }));
}

export async function staffCourses(viewer: Viewer): Promise<StaffCourseCard[]> {
  let rows: (typeof courses.$inferSelect)[];
  if (viewer.role === "lecturer") {
    rows = await db.select().from(courses).where(eq(courses.lecturerId, viewer.id)).orderBy(courses.code);
  } else {
    rows = await db
      .select({ c: courses })
      .from(courseTas)
      .innerJoin(courses, eq(courses.id, courseTas.courseId))
      .where(eq(courseTas.userId, viewer.id))
      .orderBy(courses.code)
      .then((r) => r.map((x) => x.c));
  }
  return staffCards(viewer, rows);
}

export async function createCourse(viewer: Viewer, input: { code: string; title: string; language: string }) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const [course] = await db
        .insert(courses)
        .values({ ...input, code: input.code.trim().toUpperCase(), joinCode: newJoinCode(), lecturerId: viewer.id })
        .returning();
      return course;
    } catch (err) {
      if (String(err).includes("join_code")) continue;
      throw err;
    }
  }
  throw conflict("Couldn't create a unique join code. Try again.");
}

export async function deleteCourse(viewer: Viewer, courseId: string): Promise<void> {
  const course = await staffAccess(viewer, courseId, "edit");
  // The demo logins are public, so a visitor could otherwise wipe the sample courses before a demo.
  if (course.isSample) throw conflict("Sample courses stay for the demo, so they can't be deleted.");
  if ((await liveSessions([courseId])).size) throw conflict("A Session is still open. Close it in the console, then delete the course.");
  // Rounds point at their Exercise without a cascade, so the Sessions and their Rounds go first;
  // the course row then takes its Exercises, enrolments and TA links with it.
  await db.transaction(async (tx) => {
    await tx.delete(sessions).where(eq(sessions.courseId, courseId));
    // Simulated classmates are made for one course and can't sign in, so they would be left belonging nowhere.
    const ownSimulated = tx
      .select({ id: users.id })
      .from(users)
      .innerJoin(enrolments, eq(enrolments.userId, users.id))
      .where(
        and(
          eq(enrolments.courseId, courseId),
          eq(users.isSimulated, true),
          sql`not exists (select 1 from ${enrolments} other where other.user_id = ${users.id} and other.course_id <> ${courseId})`,
        ),
      );
    await tx.delete(users).where(inArray(users.id, ownSimulated));
    await tx.delete(courses).where(eq(courses.id, courseId));
  });
}

export async function courseDetail(viewer: Viewer, courseId: string): Promise<CourseDetail> {
  const course = await staffAccess(viewer, courseId, "read");
  const [card] = await staffCards(viewer, [course]);
  const exerciseRowsAgg = await db
    .select({
      id: exercises.id,
      title: exercises.title,
      language: exercises.language,
      steps: count(exerciseRows.id),
      dealable: sql<number>`count(*) filter (where ${exerciseRows.given} = false)`.mapWith(Number),
    })
    .from(exercises)
    .leftJoin(exerciseRows, eq(exerciseRows.exerciseId, exercises.id))
    .where(eq(exercises.courseId, courseId))
    .groupBy(exercises.id)
    .orderBy(exercises.createdAt);
  const playedIds = new Set(
    (
      await db
        .selectDistinct({ id: rounds.exerciseId })
        .from(rounds)
        .innerJoin(sessions, eq(sessions.id, rounds.sessionId))
        .where(eq(sessions.courseId, courseId))
    ).map((r) => r.id),
  );
  const sessionRows = await db
    .select({
      id: sessions.id,
      status: sessions.status,
      mode: sessions.mode,
      createdAt: sessions.createdAt,
      rounds: sql<number>`(select count(*) from ${rounds} where ${rounds.sessionId} = ${sessions.id})`.mapWith(Number),
      participants: sql<number>`(select count(*) from ${participants} where ${participants.sessionId} = ${sessions.id})`.mapWith(
        Number,
      ),
    })
    .from(sessions)
    .where(eq(sessions.courseId, courseId))
    .orderBy(desc(sessions.createdAt))
    .limit(30);
  return {
    course: card,
    exercises: exerciseRowsAgg.map((e) => ({ ...e, played: playedIds.has(e.id) })),
    sessions: sessionRows.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() })),
  };
}
