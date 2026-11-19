"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState, ErrorNote, Heading, Loading, Panel, Tag, pct } from "@/components/ui";
import { useApi } from "@/lib/client";
import { sortBy } from "@/lib/sort";
import type { CourseDashboard } from "@/lib/api-types";
import { StepBars } from "./StepBars";

type SortKey = "name" | "rounds" | "firstTryRate" | "avgRetries" | "points";

const STUDENT_CELL = "sticky left-0 z-10 bg-parchment pr-3";
const NUMBER_CELL = "whitespace-nowrap px-2 text-right tabular-nums";

function Trend({ values }: { values: number[] }) {
  if (values.length < 2) return <span className="text-xs text-ink-soft">-</span>;
  const max = Math.max(...values, 1);
  const w = 64;
  const h = 18;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - (v / max) * h}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-label={`Points per Session: ${values.join(", ")}`} role="img">
      <polyline points={points} fill="none" stroke="#3f9b4f" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export function Dashboard({ courseId }: { courseId: string }) {
  const { data, error } = useApi<CourseDashboard>(`/api/courses/${courseId}/dashboard`);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "firstTryRate", dir: 1 });
  const [hideSimulated, setHideSimulated] = useState(false);
  const [exerciseId, setExerciseId] = useState<string | null>(null);

  const students = useMemo(() => {
    const list = (data?.students ?? []).filter((s) => !hideSimulated || !s.isSimulated);
    return sortBy(list, (s) => s[sort.key], sort.dir, (a, b) => a.name.localeCompare(b.name));
  }, [data, sort, hideSimulated]);

  if (error) return <ErrorNote>{error.message}</ErrorNote>;
  if (!data) return <Loading label="Counting the harvest..." />;
  const exercise = data.exercises.find((e) => e.exerciseId === exerciseId) ?? data.exercises[0];

  const header = (key: SortKey, label: string, className: string) => (
    <th className={className} aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : undefined}>
      <button
        type="button"
        className="whitespace-nowrap font-bold underline decoration-dotted"
        onClick={() => setSort((s) => ({ key, dir: s.key === key ? ((-s.dir) as 1 | -1) : key === "name" ? 1 : -1 }))}
      >
        {label}
        {sort.key === key ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
      </button>
    </th>
  );

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <Panel>
        <Heading>Hardest steps</Heading>
        <p className="text-sm">Share of students right on the first try, and where they most often put the line instead. Use it to decide what to reteach.</p>
        {data.exercises.length === 0 ? (
          <EmptyState title="No Rounds played yet">Once a Session runs, this shows which steps the class finds hardest.</EmptyState>
        ) : (
          <>
            <div className="mt-2 flex flex-wrap gap-1">
              {data.exercises.map((e) => (
                <button key={e.exerciseId} className={`px-btn !py-1 text-sm ${exercise?.exerciseId === e.exerciseId ? "px-btn-sun" : "px-btn-secondary"}`} onClick={() => setExerciseId(e.exerciseId)}>
                  {e.title} ({e.rounds})
                </button>
              ))}
            </div>
            <StepBars steps={exercise?.steps ?? []} />
          </>
        )}
      </Panel>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Heading>Students</Heading>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={hideSimulated} onChange={(e) => setHideSimulated(e.target.checked)} /> Hide simulated students
          </label>
        </div>
        <div className="mt-2 max-h-[640px] overflow-auto">
          <table className="w-full min-w-[440px] text-sm">
            <thead className="sticky top-0 z-20 bg-parchment">
              <tr className="border-b-2 border-parchment-dark">
                {header("name", "Student", `${STUDENT_CELL} py-1.5 text-left`)}
                {header("rounds", "Rounds", `${NUMBER_CELL} py-1.5`)}
                {header("firstTryRate", "First try", `${NUMBER_CELL} py-1.5`)}
                {header("avgRetries", "Retries", `${NUMBER_CELL} py-1.5`)}
                {header("points", "Points", `${NUMBER_CELL} py-1.5`)}
                <th className="hidden py-1.5 pl-3 text-left sm:table-cell">Trend</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center">
                    No students yet. They appear here once they enrol with the join code.
                  </td>
                </tr>
              )}
              {students.map((s) => (
                <tr key={s.userId} className="border-t border-parchment-dark">
                  <td className={`${STUDENT_CELL} py-1.5`}>
                    <span className="flex items-center justify-between gap-2">
                      <Link href={`/teach/courses/${courseId}/students/${s.userId}`} className="font-bold underline">
                        {s.name}
                      </Link>
                      {s.isSimulated && <Tag className="shrink-0">simulated</Tag>}
                    </span>
                    <span className="block text-xs text-ink-soft">{s.nickname}</span>
                  </td>
                  <td className={NUMBER_CELL}>{s.rounds}</td>
                  <td className={NUMBER_CELL}>{pct(s.firstTryRate)}</td>
                  <td className={NUMBER_CELL}>{s.avgRetries === null ? "-" : s.avgRetries.toFixed(1)}</td>
                  <td className={`${NUMBER_CELL} font-bold`}>{s.points.toLocaleString()}</td>
                  <td className="hidden pl-3 sm:table-cell">
                    <Trend values={s.trend} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
