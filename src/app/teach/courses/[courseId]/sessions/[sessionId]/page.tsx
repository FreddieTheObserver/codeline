import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { Loading } from "@/components/ui";
import { SessionReportView } from "./SessionReportView";

export const metadata: Metadata = { title: "Session summary" };

export default function SessionSummaryPage({ params }: PageProps<"/teach/courses/[courseId]/sessions/[sessionId]">) {
  return (
    <Suspense fallback={<PageShell><Loading /></PageShell>}>
      {params.then(({ courseId, sessionId }) => (
        <SessionReportView courseId={courseId} sessionId={sessionId} />
      ))}
    </Suspense>
  );
}
