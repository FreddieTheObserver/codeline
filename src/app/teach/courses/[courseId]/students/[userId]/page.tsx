import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/ui";
import { StudentView } from "./StudentView";

export const metadata: Metadata = { title: "Student" };

export default function StudentPage({ params }: PageProps<"/teach/courses/[courseId]/students/[userId]">) {
  return (
    <Suspense fallback={<Loading />}>
      {params.then(({ courseId, userId }) => (
        <StudentView courseId={courseId} userId={userId} />
      ))}
    </Suspense>
  );
}
