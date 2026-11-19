import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { Loading } from "@/components/ui";
import { StudentView } from "./StudentView";

export const metadata: Metadata = { title: "Student" };

export default function StudentPage({ params }: PageProps<"/teach/courses/[courseId]/students/[userId]">) {
  return (
    <Suspense fallback={<PageShell><Loading /></PageShell>}>
      {params.then(({ courseId, userId }) => (
        <StudentView courseId={courseId} userId={userId} />
      ))}
    </Suspense>
  );
}
