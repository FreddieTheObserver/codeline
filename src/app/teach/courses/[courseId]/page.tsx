import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { Loading } from "@/components/ui";
import { CourseView } from "./CourseView";
import { parseTab } from "./tabs";

export const metadata: Metadata = { title: "Course" };

export default function CoursePage({ params, searchParams }: PageProps<"/teach/courses/[courseId]">) {
  return (
    <Suspense fallback={<PageShell><Loading /></PageShell>}>
      {Promise.all([params, searchParams]).then(([{ courseId }, query]) => (
        <CourseView courseId={courseId} initialTab={parseTab(query.tab)} />
      ))}
    </Suspense>
  );
}
