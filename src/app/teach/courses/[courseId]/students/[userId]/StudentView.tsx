"use client";

import Link from "next/link";
import { PageShell } from "@/components/AppHeader";
import { Sprite } from "@/components/pixel/Sprite";
import { BLOOM, WILT } from "@/components/pixel/sprites";
import { ErrorNote, Heading, Loading, Panel, Tag, Title, pct } from "@/components/ui";
import { useApi } from "@/lib/client";
import type { StudentDetail } from "@/lib/api-types";

export function StudentView({ courseId, userId }: { courseId: string; userId: string }) {
  const { data, error } = useApi<StudentDetail>(`/api/courses/${courseId}/students/${userId}`);
  if (error) return <PageShell><ErrorNote>{error.message}</ErrorNote></PageShell>;
  if (!data) return <PageShell><Loading /></PageShell>;
  const corrects = data.placements.filter((p) => p.correct);
  const firstTry = corrects.length ? corrects.filter((p) => p.attempt === 1).length / corrects.length : null;
  const reasons = data.placements.filter((p) => p.reason).length;
  const byExercise = new Map<string, StudentDetail["placements"]>();
  for (const p of data.placements) byExercise.set(p.exerciseTitle, [...(byExercise.get(p.exerciseTitle) ?? []), p]);

  return (
    <PageShell>
      <p className="text-sm">
        <Link href={`/teach/courses/${courseId}`} className="underline">
          {data.course.code}
        </Link>{" "}
        / Student
      </p>
      <Title className="mt-1">
        {data.student.name} {data.student.isSimulated && <Tag>simulated</Tag>}
      </Title>
      <p>
        {data.student.isSimulated ? "Simulated student" : `Student ID ${data.student.loginId}`} · nickname {data.student.nickname}
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-4">
        {[
          ["Placements", String(data.placements.length)],
          ["Snippets placed", String(corrects.length)],
          ["Right first try", pct(firstTry)],
          ["Reasons given", String(reasons)],
        ].map(([label, value]) => (
          <Panel key={label} className="text-center">
            <p className="font-pixel text-3xl">{value}</p>
            <p className="text-sm">{label}</p>
          </Panel>
        ))}
      </div>
      {[...byExercise.entries()].map(([title, list]) => (
        <Panel key={title} className="mt-4">
          <Heading>{title}</Heading>
          <ul className="mt-2 flex flex-col gap-1">
            {list.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 border-t border-parchment-dark py-1 text-sm">
                <Sprite grid={p.correct ? BLOOM : WILT} scale={2} />
                <code className="bg-[#fffdf6] px-1 font-mono">{p.snippet}</code>
                <span>
                  → step {p.slotPosition} ({p.slotPseudocode})
                </span>
                <strong className={p.correct ? "text-leaf-dark" : "text-berry-dark"}>{p.correct ? "right" : "wrong"}</strong>
                {p.attempt > 1 && <span>try {p.attempt}</span>}
                {p.points > 0 && <span>+{p.points}</span>}
                {p.reason && <q className="italic">{p.reason}</q>}
                <span className="ml-auto text-xs text-ink-soft">{new Date(p.at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </Panel>
      ))}
      {data.placements.length === 0 && <Panel className="mt-4">No Placements yet.</Panel>}
    </PageShell>
  );
}
