"use client";

import { PageShell } from "@/components/PageShell";
import { ErrorState, Loading } from "@/components/ui";
import { useApi } from "@/lib/client";
import type { CourseDetail } from "@/lib/api-types";
import { ExerciseEditor } from "../../../../ExerciseEditor";
import { courseHref } from "../../tabs";

export function NewExercise({ courseId }: { courseId: string }) {
  const { data, error } = useApi<CourseDetail>(`/api/courses/${courseId}`);
  if (error) return <PageShell><ErrorState message={error.message} backHref="/teach" backLabel="Back to my courses" /></PageShell>;
  if (!data) return <PageShell><Loading /></PageShell>;
  if (!data.course.canEdit)
    return (
      <PageShell>
        <ErrorState message="Only the course lecturer can write Exercises." backHref={courseHref(courseId)} backLabel={`Back to ${data.course.code}`} />
      </PageShell>
    );
  return <ExerciseEditor courseId={courseId} courseCode={data.course.code} />;
}
