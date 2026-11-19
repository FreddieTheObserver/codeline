"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState, ErrorNote, Heading, Loading, Panel, Tag, pct } from "@/components/ui";
import { useApi } from "@/lib/client";
import { sortBy } from "@/lib/sort";
import type { CourseDashboard } from "@/lib/api-types";

type SortKey = "name" | "rounds" | "firstTryRate" | "avgRetries" | "points";

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

  const header = (key: SortKey, label: string, right?: boolean) => (
    <th className={right ? "text-right" : "text-left"}>
      <button
        className="font-bold underline decoration-dotted"
        onClick={() => setSort((s) => ({ key, dir: s.key === key ? ((-s.dir) as 1 | -1) : key === "name" ? 1 : -1 }))}
        aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : undefined}
      >
        {label}
        {sort.key === key ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
      </button>
    </th>
  );

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
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
            <ul className="mt-3 flex flex-col gap-3">
              {exercise?.steps.map((s) => {
                const rate = s.firstTryRate;
                const color = rate === null ? "#ecdcb6" : rate >= 0.7 ? "#3f9b4f" : rate >= 0.45 ? "#e9b949" : "#c8483f";
                return (
                  <li key={s.slotId}>
                    <div className="flex justify-between gap-2 text-sm">
                      <span className="font-bold">
                        {s.position + 1}. {s.pseudocode}
                      </span>
                      <span>{pct(rate)}</span>
                    </div>
                    <div className="mt-0.5 h-4 border-2 border-ink bg-parchment-dark">
                      <div className="h-full" style={{ width: `${Math.round((rate ?? 0) * 100)}%`, background: color }} />
                    </div>
                    {s.commonWrong && s.commonWrong.share > 0 && (
                      <p className="mt-0.5 text-xs text-ink-soft">
                        {Math.round(s.commonWrong.share * 100)}% put it at step {s.commonWrong.position + 1} ({s.commonWrong.pseudocode}) instead
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
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
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-parchment">
              <tr>
                {header("name", "Student")}
                {header("rounds", "Rounds", true)}
                {header("firstTryRate", "First try", true)}
                {header("avgRetries", "Retries", true)}
                {header("points", "Points", true)}
                <th className="pl-2 text-left">Trend</th>
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
                  <td className="py-1.5 pr-2">
                    <Link href={`/teach/courses/${courseId}/students/${s.userId}`} className="font-bold underline">
                      {s.name}
                    </Link>
                    {s.isSimulated && <Tag className="ml-1">simulated</Tag>}
                    <span className="block text-xs text-ink-soft">{s.nickname}</span>
                  </td>
                  <td className="text-right">{s.rounds}</td>
                  <td className="text-right">{pct(s.firstTryRate)}</td>
                  <td className="text-right">{s.avgRetries === null ? "-" : s.avgRetries.toFixed(1)}</td>
                  <td className="text-right font-bold">{s.points.toLocaleString()}</td>
                  <td className="pl-2">
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
