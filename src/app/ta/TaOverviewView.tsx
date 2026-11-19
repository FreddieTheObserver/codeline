"use client";

import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { ErrorState, LanguageTag, Loading, PageHeader, Panel, SampleTag, Stat, pct } from "@/components/ui";
import { useApi } from "@/lib/client";
import type { TaOverview } from "@/lib/api-types";
import { courseHref } from "@/app/teach/courses/[courseId]/tabs";

export function TaOverviewView() {
  const { data, error } = useApi<TaOverview>("/api/ta/overview");
  if (error) return <PageShell><ErrorState message={error.message} backHref="/teach" backLabel="Back to my courses" /></PageShell>;
  if (!data) return <PageShell><Loading label="Gathering every course..." /></PageShell>;
  const totals = data.courses.reduce((a, c) => ({ sessions: a.sessions + c.sessions, rounds: a.rounds + c.rounds, placements: a.placements + c.placements, enrolled: a.enrolled + c.enrolled }), { sessions: 0, rounds: 0, placements: 0, enrolled: 0 });

  return (
    <PageShell>
      <PageHeader
        title="Department overview"
        description="Every course, read-only. Export the numbers to prepare a report for the lecturers. The CSV marks simulated students so they can be filtered out."
        actions={
          <a href="/api/ta/export" className="px-btn px-btn-sun inline-block no-underline" download>
            Export CSV report
          </a>
        }
      />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Courses" value={data.courses.length.toLocaleString()} />
        <Stat label="Enrolments" value={totals.enrolled.toLocaleString()} />
        <Stat label="Sessions run" value={totals.sessions.toLocaleString()} />
        <Stat label="Snippets placed" value={totals.placements.toLocaleString()} />
      </div>
      <Panel className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b-2 border-parchment-dark">
              <th className="py-2">Course</th>
              <th className="text-right">Students</th>
              <th className="text-right">Sessions</th>
              <th className="text-right">Rounds</th>
              <th className="text-right">Right first try</th>
              <th className="text-right">Retries per snippet</th>
              <th className="pl-3">Hardest step</th>
            </tr>
          </thead>
          <tbody>
            {data.courses.map((c) => (
              <tr key={c.id} className="border-t border-parchment-dark align-top">
                <td className="py-2">
                  <Link href={courseHref(c.id, "dashboard")} className="font-bold underline">
                    {c.code}
                  </Link>{" "}
                  <LanguageTag language={c.language} /> {c.isSample && <SampleTag />}
                  <span className="block text-xs">{c.title}</span>
                </td>
                <td className="text-right">{c.enrolled}</td>
                <td className="text-right">{c.sessions}</td>
                <td className="text-right">{c.rounds}</td>
                <td className="text-right font-bold">{pct(c.firstTryRate)}</td>
                <td className="text-right">{c.avgRetries === null ? "-" : c.avgRetries.toFixed(2)}</td>
                <td className="pl-3">
                  {c.hardest ? (
                    <>
                      {c.hardest.exerciseTitle}, step {c.hardest.position}: {c.hardest.pseudocode}{" "}
                      <strong>({pct(c.hardest.firstTryRate)})</strong>
                    </>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </PageShell>
  );
}
