import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "../db/client";
import { courseTas, courses, enrolments } from "../db/schema";
import { forbidden, notFound } from "../http";
import type { Viewer } from "@/lib/api-types";

export type Need = "read" | "run" | "edit";

// Lecturers own their Courses. Teaching assistants read every Course and run
// Sessions for the Courses they assist, but never write Exercises.
export async function staffAccess(viewer: Viewer, courseId: string, need: Need) {
  const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
  if (!course) throw notFound("Course not found.");
  if (viewer.role === "lecturer" && course.lecturerId === viewer.id) return course;
  if (viewer.role === "ta") {
    if (need === "read") return course;
    if (need === "run") {
      const [assist] = await db
        .select()
        .from(courseTas)
        .where(and(eq(courseTas.courseId, courseId), eq(courseTas.userId, viewer.id)))
        .limit(1);
      if (assist) return course;
    }
  }
  throw forbidden();
}

export async function canEditCourse(viewer: Viewer, courseId: string): Promise<boolean> {
  try {
    await staffAccess(viewer, courseId, "edit");
    return true;
  } catch {
    return false;
  }
}

export async function canRunCourse(viewer: Viewer, courseId: string): Promise<boolean> {
  try {
    await staffAccess(viewer, courseId, "run");
    return true;
  } catch {
    return false;
  }
}

export async function requireEnrolled(viewer: Viewer, courseId: string): Promise<void> {
  const [row] = await db
    .select()
    .from(enrolments)
    .where(and(eq(enrolments.courseId, courseId), eq(enrolments.userId, viewer.id)))
    .limit(1);
  if (!row) throw forbidden("Enter this Course's join code first.");
}
