import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/ui";
import { CourseView } from "./CourseView";

export const metadata: Metadata = { title: "Course" };

export default function CoursePage({ params }: PageProps<"/teach/courses/[courseId]">) {
  return (
    <Suspense fallback={<Loading />}>
      {params.then(({ courseId }) => (
        <CourseView courseId={courseId} />
      ))}
    </Suspense>
  );
}
