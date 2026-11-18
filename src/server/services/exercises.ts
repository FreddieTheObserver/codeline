import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { courses, exerciseRows, exercises, hands, placements, rounds } from "../db/schema";
import { badRequest, conflict, notFound } from "../http";
import { staffAccess } from "./access";
import type { ExerciseDto, Viewer } from "@/lib/api-types";

export const exerciseInput = z.object({
  title: z.string().trim().min(1, "Give the Exercise a title.").max(80),
  description: z.string().trim().max(400).default(""),
  language: z.string().trim().min(1).max(20),
  rows: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        pseudocode: z.string().max(200),
        code: z.string().max(300),
        indent: z.number().int().min(0).max(12),
        given: z.boolean(),
      }),
    )
    .min(2, "An Exercise needs at least two rows.")
    .max(60),
});

export type ExerciseInput = z.infer<typeof exerciseInput>;

function validateRows(rows: ExerciseInput["rows"]) {
  if (rows.some((r) => !r.code.trim())) throw badRequest("Every row needs a line of code.");
  if (!rows.some((r) => !r.given)) throw badRequest("Leave at least one row not Given, so there's something to place.");
  const missing = rows.findIndex((r) => !r.given && !r.pseudocode.trim());
  if (missing >= 0) throw badRequest(`Row ${missing + 1} is dealt to students, so it needs a pseudocode step.`);
}

async function playedRowIds(exerciseId: string): Promise<Set<string>> {
  const rowIds = db.select({ id: exerciseRows.id }).from(exerciseRows).where(eq(exerciseRows.exerciseId, exerciseId));
  const used = await db
    .selectDistinct({ id: hands.rowId })
    .from(hands)
    .where(inArray(hands.rowId, rowIds))
    .union(db.selectDistinct({ id: placements.slotId }).from(placements).where(inArray(placements.slotId, rowIds)));
  return new Set(used.map((r) => r.id));
}

async function isPlayed(exerciseId: string): Promise<boolean> {
  const [row] = await db.select({ n: sql<number>`1` }).from(rounds).where(eq(rounds.exerciseId, exerciseId)).limit(1);
  return Boolean(row);
}

export async function getExercise(viewer: Viewer, id: string): Promise<ExerciseDto> {
  const [ex] = await db
    .select({ e: exercises, courseCode: courses.code })
    .from(exercises)
    .innerJoin(courses, eq(courses.id, exercises.courseId))
    .where(eq(exercises.id, id));
  if (!ex) throw notFound("Exercise not found.");
  await staffAccess(viewer, ex.e.courseId, "read");
  let canEdit = true;
  try {
    await staffAccess(viewer, ex.e.courseId, "edit");
  } catch {
    canEdit = false;
  }
  const rows = await db.select().from(exerciseRows).where(eq(exerciseRows.exerciseId, id)).orderBy(asc(exerciseRows.position));
  const used = await playedRowIds(id);
  return {
    id: ex.e.id,
    courseId: ex.e.courseId,
    courseCode: ex.courseCode,
    title: ex.e.title,
    description: ex.e.description,
    language: ex.e.language,
    rows: rows.map((r) => ({ id: r.id, pseudocode: r.pseudocode, code: r.code, indent: r.indent, given: r.given, played: used.has(r.id) })),
    played: await isPlayed(id),
    canEdit,
  };
}

export async function createExercise(viewer: Viewer, courseId: string, input: ExerciseInput): Promise<string> {
  await staffAccess(viewer, courseId, "edit");
  validateRows(input.rows);
  return db.transaction(async (tx) => {
    const [ex] = await tx
      .insert(exercises)
      .values({ courseId, title: input.title, description: input.description, language: input.language, createdBy: viewer.id })
      .returning({ id: exercises.id });
    await tx.insert(exerciseRows).values(
      input.rows.map((r, position) => ({
        exerciseId: ex.id,
        position,
        pseudocode: r.pseudocode.trim(),
        code: r.code.trim(),
        indent: r.indent,
        given: r.given,
      })),
    );
    return ex.id;
  });
}

export async function updateExercise(viewer: Viewer, id: string, input: ExerciseInput): Promise<void> {
  const [ex] = await db.select().from(exercises).where(eq(exercises.id, id));
  if (!ex) throw notFound("Exercise not found.");
  await staffAccess(viewer, ex.courseId, "edit");
  validateRows(input.rows);
  const existing = await db.select().from(exerciseRows).where(eq(exerciseRows.exerciseId, id));
  const keep = new Set(input.rows.flatMap((r) => (r.id ? [r.id] : [])));
  const removed = existing.filter((r) => !keep.has(r.id));
  const used = await playedRowIds(id);
  if (removed.some((r) => used.has(r.id))) {
    throw conflict("A row you removed has already been played. Duplicate the Exercise to restructure it.");
  }
  await db.transaction(async (tx) => {
    await tx
      .update(exercises)
      .set({ title: input.title, description: input.description, language: input.language, updatedAt: new Date() })
      .where(eq(exercises.id, id));
    if (removed.length) await tx.delete(exerciseRows).where(inArray(exerciseRows.id, removed.map((r) => r.id)));
    // Shift positions out of the way first so the unique (exercise, position) index never clashes.
    await tx
      .update(exerciseRows)
      .set({ position: sql`${exerciseRows.position} + 1000` })
      .where(eq(exerciseRows.exerciseId, id));
    for (const [position, r] of input.rows.entries()) {
      const values = { pseudocode: r.pseudocode.trim(), code: r.code.trim(), indent: r.indent, given: r.given, position };
      if (r.id && existing.some((e) => e.id === r.id)) {
        await tx.update(exerciseRows).set(values).where(and(eq(exerciseRows.id, r.id), eq(exerciseRows.exerciseId, id)));
      } else {
        await tx.insert(exerciseRows).values({ exerciseId: id, ...values });
      }
    }
  });
}

export async function duplicateExercise(viewer: Viewer, id: string): Promise<string> {
  const source = await getExercise(viewer, id);
  return createExercise(viewer, source.courseId, {
    title: `${source.title} (copy)`.slice(0, 80),
    description: source.description,
    language: source.language,
    rows: source.rows.map(({ pseudocode, code, indent, given }) => ({ pseudocode, code, indent, given })),
  });
}

export async function deleteExercise(viewer: Viewer, id: string): Promise<void> {
  const [ex] = await db.select().from(exercises).where(eq(exercises.id, id));
  if (!ex) throw notFound("Exercise not found.");
  await staffAccess(viewer, ex.courseId, "edit");
  if (await isPlayed(id)) throw conflict("This Exercise has been played, so it stays for the dashboards.");
  await db.delete(exercises).where(eq(exercises.id, id));
}
