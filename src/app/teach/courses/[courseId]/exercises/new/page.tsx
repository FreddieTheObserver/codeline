import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/ui";
import { NewExercise } from "./NewExercise";

export const metadata: Metadata = { title: "New Exercise" };

export default function NewExercisePage({ params }: PageProps<"/teach/courses/[courseId]/exercises/new">) {
  return (
    <Suspense fallback={<Loading />}>
      {params.then(({ courseId }) => (
        <NewExercise courseId={courseId} />
      ))}
    </Suspense>
  );
}
