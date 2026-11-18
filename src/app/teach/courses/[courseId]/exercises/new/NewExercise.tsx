"use client";

import { PageShell } from "@/components/AppHeader";
import { ErrorNote, Loading } from "@/components/ui";
import { useApi } from "@/lib/client";
import type { CourseDetail } from "@/lib/api-types";
import { ExerciseEditor } from "../../../../ExerciseEditor";

export function NewExercise({ courseId }: { courseId: string }) {
  const { data, error } = useApi<CourseDetail>(`/api/courses/${courseId}`);
  if (error) return <PageShell><ErrorNote>{error.message}</ErrorNote></PageShell>;
  if (!data) return <PageShell><Loading /></PageShell>;
  if (!data.course.canEdit) return <PageShell><ErrorNote>Only the course lecturer can write Exercises.</ErrorNote></PageShell>;
  return <ExerciseEditor courseId={courseId} courseCode={data.course.code} />;
}
