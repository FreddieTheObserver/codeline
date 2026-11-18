"use client";

import { useState } from "react";
import { PageShell } from "@/components/AppHeader";
import { ErrorNote, Loading } from "@/components/ui";
import { useApi } from "@/lib/client";
import type { ExerciseDto } from "@/lib/api-types";
import { ExerciseEditor } from "../../ExerciseEditor";

export function EditExercise({ exerciseId }: { exerciseId: string }) {
  const { data, error, mutate } = useApi<ExerciseDto>(`/api/exercises/${exerciseId}`, { revalidateOnFocus: false });
  const [version, setVersion] = useState(0);
  if (error) return <PageShell><ErrorNote>{error.message}</ErrorNote></PageShell>;
  if (!data) return <PageShell><Loading /></PageShell>;
  return (
    <ExerciseEditor
      key={`${data.id}-${version}`}
      courseId={data.courseId}
      courseCode={data.courseCode}
      initial={data}
      onSaved={async () => {
        await mutate();
        setVersion((v) => v + 1);
      }}
    />
  );
}
