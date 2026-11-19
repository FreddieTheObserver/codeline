import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { Loading } from "@/components/ui";
import { EditExercise } from "./EditExercise";

export const metadata: Metadata = { title: "Exercise" };

export default function ExercisePage({ params }: PageProps<"/teach/exercises/[exerciseId]">) {
  return (
    <Suspense fallback={<PageShell><Loading /></PageShell>}>
      {params.then(({ exerciseId }) => (
        <EditExercise exerciseId={exerciseId} />
      ))}
    </Suspense>
  );
}
