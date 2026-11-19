"use client";

import { PageShell } from "@/components/PageShell";
import { Sprite } from "@/components/pixel/Sprite";
import { BLOOM, WILT } from "@/components/pixel/sprites";
import { EmptyState, ErrorState, Heading, Loading, PageHeader, Panel, Stat, Tag, pct } from "@/components/ui";
import { useApi } from "@/lib/client";
import type { StudentDetail } from "@/lib/api-types";
import { courseHref } from "../../tabs";

export function StudentView({ courseId, userId }: { courseId: string; userId: string }) {
  const { data, error } = useApi<StudentDetail>(`/api/courses/${courseId}/students/${userId}`);
  const dashboard = courseHref(courseId, "dashboard");
  if (error) return <PageShell><ErrorState message={error.message} backHref={dashboard} backLabel="Back to the dashboard" /></PageShell>;
  if (!data) return <PageShell><Loading /></PageShell>;
  const corrects = data.placements.filter((p) => p.correct);
  const firstTry = corrects.length ? corrects.filter((p) => p.attempt === 1).length / corrects.length : null;
  const reasons = data.placements.filter((p) => p.reason).length;
  const byExercise = new Map<string, StudentDetail["placements"]>();
  for (const p of data.placements) byExercise.set(p.exerciseTitle, [...(byExercise.get(p.exerciseTitle) ?? []), p]);

  return (
    <PageShell reveal>
      <PageHeader
        breadcrumbs={[
          { label: "My courses", href: "/teach" },
          { label: data.course.code, href: courseHref(courseId) },
          { label: "Dashboard", href: dashboard },
          { label: data.student.name },
        ]}
        tags={data.student.isSimulated ? <Tag>simulated</Tag> : undefined}
        title={data.student.name}
        description={`${data.student.isSimulated ? "Simulated student" : `Student ID ${data.student.loginId}`} · nickname ${data.student.nickname}`}
      />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Placements" value={data.placements.length} />
        <Stat label="Snippets placed" value={corrects.length} />
        <Stat label="Right first try" value={pct(firstTry)} />
        <Stat label="Reasons given" value={reasons} />
      </div>
      {data.placements.length === 0 && (
        <Panel className="mt-4">
          <EmptyState title="No Placements yet">This student hasn&apos;t planted a seed in this course yet.</EmptyState>
        </Panel>
      )}
      {[...byExercise.entries()].map(([title, list]) => (
        <Panel key={title} className="mt-4">
          <Heading>{title}</Heading>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b-2 border-parchment-dark">
                  <th className="py-2 pr-3">Result</th>
                  <th className="pr-3">Snippet</th>
                  <th className="pr-3">Placed at</th>
                  <th className="pr-3 text-right">Try</th>
                  <th className="pr-3 text-right">Points</th>
                  <th className="pr-3">Reason</th>
                  <th className="text-right">When</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id} className="border-t border-parchment-dark align-top">
                    <td className="py-1.5 pr-3">
                      <span className="inline-flex items-center gap-1.5">
                        <Sprite grid={p.correct ? BLOOM : WILT} scale={2} />
                        <strong className={p.correct ? "text-leaf-dark" : "text-berry-dark"}>{p.correct ? "Right" : "Wrong"}</strong>
                      </span>
                    </td>
                    <td className="py-1.5 pr-3">
                      <code className="bg-[#fffdf6] px-1 font-mono">{p.snippet}</code>
                    </td>
                    <td className="py-1.5 pr-3">
                      Step {p.slotPosition}: {p.slotPseudocode}
                    </td>
                    <td className="py-1.5 pr-3 text-right">{p.attempt}</td>
                    <td className="py-1.5 pr-3 text-right">{p.points > 0 ? `+${p.points}` : "-"}</td>
                    <td className="py-1.5 pr-3">{p.reason ? <q className="italic">{p.reason}</q> : <span className="text-ink-soft">-</span>}</td>
                    <td className="whitespace-nowrap py-1.5 text-right text-xs text-ink-soft">{new Date(p.at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ))}
    </PageShell>
  );
}
