"use client";

import Link from "next/link";
import { PageShell } from "@/components/AppHeader";
import { ErrorNote, LanguageTag, Loading, Panel, SampleTag, Title, pct } from "@/components/ui";
import { useApi } from "@/lib/client";
import type { TaOverview } from "@/lib/api-types";

export function TaOverviewView() {
  const { data, error } = useApi<TaOverview>("/api/ta/overview");
  if (error) return <PageShell><ErrorNote>{error.message}</ErrorNote></PageShell>;
  if (!data) return <PageShell><Loading label="Gathering every course..." /></PageShell>;
  const totals = data.courses.reduce((a, c) => ({ sessions: a.sessions + c.sessions, rounds: a.rounds + c.rounds, placements: a.placements + c.placements, enrolled: a.enrolled + c.enrolled }), { sessions: 0, rounds: 0, placements: 0, enrolled: 0 });

  return (
    <PageShell wide>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <Title>Department overview</Title>
          <p>Every course, read-only. Export the numbers to prepare a report for the lecturers.</p>
        </div>
        <a href="/api/ta/export" className="px-btn px-btn-sun inline-block no-underline" download>
          Export CSV report
        </a>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        {[
          ["Courses", data.courses.length],
          ["Enrolments", totals.enrolled],
          ["Sessions run", totals.sessions],
          ["Snippets placed", totals.placements],
        ].map(([label, value]) => (
          <Panel key={label} className="text-center">
            <p className="font-pixel text-3xl">{Number(value).toLocaleString()}</p>
            <p className="text-sm">{label}</p>
          </Panel>
        ))}
      </div>
      <Panel className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr>
              <th className="py-1">Course</th>
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
                  <Link href={`/teach/courses/${c.id}`} className="font-bold underline">
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
      <p className="mt-2 text-xs">The CSV marks simulated students so they can be filtered out.</p>
    </PageShell>
  );
}
