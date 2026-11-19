import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { Loading } from "@/components/ui";
import { NewExercise } from "./NewExercise";

export const metadata: Metadata = { title: "New Exercise" };

export default function NewExercisePage({ params }: PageProps<"/teach/courses/[courseId]/exercises/new">) {
  return (
    <Suspense fallback={<PageShell><Loading /></PageShell>}>
      {params.then(({ courseId }) => (
        <NewExercise courseId={courseId} />
      ))}
    </Suspense>
  );
}
