"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/feedback";
import { JoinQr } from "@/components/garden/JoinQr";
import { PageShell } from "@/components/PageShell";
import { Sprite } from "@/components/pixel/Sprite";
import { SPROUT } from "@/components/pixel/sprites";
import { ButtonLink, EmptyState, ErrorNote, ErrorState, Heading, LanguageTag, Loading, PageHeader, Panel, SampleTag, Tag, cx } from "@/components/ui";
import { errorText, post, useApi } from "@/lib/client";
import type { CourseDetail, SessionSummary } from "@/lib/api-types";
import { Dashboard } from "./Dashboard";
import { SessionSetup } from "./SessionSetup";
import { courseHref, type CourseTab } from "./tabs";

const SESSION_STATUS: Record<SessionSummary["status"], { label: string; color: string }> = {
  lobby: { label: "In the Lobby", color: "#f6c445" },
  live: { label: "Live", color: "#f6c445" },
  closed: { label: "Closed", color: "#ecdcb6" },
};

export function CourseView({ courseId, initialTab }: { courseId: string; initialTab: CourseTab }) {
  const router = useRouter();
  const toast = useToast();
  const { data, error, mutate } = useApi<CourseDetail>(`/api/courses/${courseId}`, { refreshInterval: 10000 });
  const [tab, setTab] = useState<CourseTab>(initialTab);
  const [actionError, setActionError] = useState("");

  if (error) return <PageShell><ErrorState message={error.message} backHref="/teach" backLabel="Back to my courses" /></PageShell>;
  if (!data) return <PageShell><Loading /></PageShell>;
  const { course } = data;
  const tabs: { id: CourseTab; label: string; show: boolean }[] = [
    { id: "exercises", label: "Exercises", show: true },
    { id: "run", label: "Run a Session", show: course.canRun },
    { id: "dashboard", label: "Dashboard", show: true },
    { id: "sessions", label: "Past Sessions", show: true },
  ];
  const visibleTabs = tabs.filter((t) => t.show);
  const current = visibleTabs.find((t) => t.id === tab)?.id ?? "exercises";

  function select(next: CourseTab) {
    setTab(next);
    // Keeps the tab in the URL, so Back and the breadcrumbs on other pages return to it.
    window.history.replaceState(null, "", courseHref(courseId, next));
  }

  function moveTab(e: React.KeyboardEvent<HTMLDivElement>) {
    const at = visibleTabs.findIndex((t) => t.id === current);
    const count = visibleTabs.length;
    const to =
      e.key === "ArrowRight" ? (at + 1) % count
      : e.key === "ArrowLeft" ? (at - 1 + count) % count
      : e.key === "Home" ? 0
      : e.key === "End" ? count - 1
      : null;
    if (to === null) return;
    e.preventDefault();
    const next = visibleTabs[to].id;
    select(next);
    document.getElementById(`tab-${next}`)?.focus();
  }

  async function duplicate(id: string, title: string) {
    setActionError("");
    try {
      const { id: copy } = await post<{ id: string }>(`/api/exercises/${id}/duplicate`);
      toast(`Made a copy of ${title}. You're editing the copy now.`);
      router.push(`/teach/exercises/${copy}`);
    } catch (err) {
      setActionError(errorText(err));
    }
  }

  return (
    <PageShell>
      <PageHeader
        breadcrumbs={[{ label: "My courses", href: "/teach" }, { label: course.code }]}
        tags={
          <>
            <LanguageTag language={course.language} />
            {course.isSample && <SampleTag />}
          </>
        }
        title={`${course.code} · ${course.title}`}
        description={`${course.enrolled} students enrolled · ${course.exercises} Exercises`}
        actions={
          <Panel className="flex items-center gap-4 !p-3">
            <JoinQr code={course.joinCode} size={84} caption={false} />
            <div>
              <p className="text-sm font-bold">Course join code</p>
              <p className="font-mono text-3xl tracking-[0.25em]">{course.joinCode}</p>
              <p className="max-w-[220px] text-xs">Students enter it once after signing up, or scan the code.</p>
            </div>
          </Panel>
        }
      />

      {course.live && (
        <Panel className="mb-4 flex flex-wrap items-center gap-3 !bg-[#fff3c4] !py-2">
          <Sprite grid={SPROUT} scale={3} />
          <span className="flex-1 font-pixel">A Session is {course.live.status === "lobby" ? "waiting in the Lobby" : "live right now"}.</span>
          <ButtonLink href={`/console/${course.live.sessionId}`} tone="sun" className="!py-1">
            Open console
          </ButtonLink>
        </Panel>
      )}

      {/* The standard tabs pattern: only the selected tab is a Tab stop, and the arrow keys, Home and End move between tabs. */}
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Course sections" onKeyDown={moveTab}>
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={current === t.id}
            aria-controls="course-panel"
            tabIndex={current === t.id ? 0 : -1}
            onClick={() => select(t.id)}
            className={cx("px-btn", current === t.id ? "px-btn-sun" : "px-btn-secondary")}
          >
            {t.label}
          </button>
        ))}
      </div>
      <ErrorNote>{actionError}</ErrorNote>

      {/* Focusable because some panels open with plain text rather than a control. */}
      <div className="mt-3" role="tabpanel" id="course-panel" aria-labelledby={`tab-${current}`} tabIndex={0}>
        {current === "exercises" && (
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <Heading>Exercises</Heading>
                <p className="text-sm">Each Exercise is one program, split into steps. A Session plays one Exercise per Round.</p>
              </div>
              {course.canEdit && <ButtonLink href={`/teach/courses/${courseId}/exercises/new`}>New Exercise</ButtonLink>}
            </div>
            {data.exercises.length === 0 ? (
              <EmptyState
                title="No Exercises yet"
                action={course.canEdit ? <ButtonLink href={`/teach/courses/${courseId}/exercises/new`}>Write the first Exercise</ButtonLink> : undefined}
              >
                Paste a solution, write a plain-words step beside each line, and test play it before class.
              </EmptyState>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {data.exercises.map((e) => (
                  <li key={e.id} className="px-row flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                    <span className="font-pixel text-xl">{e.title}</span>
                    <LanguageTag language={e.language} />
                    {e.played && <Tag color="#a4d77e">played</Tag>}
                    <span className="text-sm text-ink-soft">
                      {e.steps} steps · {e.dealable} dealt as seeds
                    </span>
                    <span className="ml-auto flex gap-1">
                      <ButtonLink href={`/teach/exercises/${e.id}`} tone="secondary" className="!py-1">
                        {course.canEdit ? "Edit" : "View"}
                      </ButtonLink>
                      {course.canEdit && (
                        <button type="button" className="px-btn px-btn-secondary !py-1" onClick={() => duplicate(e.id, e.title)}>
                          Duplicate
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}
        {current === "run" && (
          <SessionSetup
            detail={data}
            onCreated={(id) => {
              void mutate();
              router.push(`/console/${id}`);
            }}
          />
        )}
        {current === "dashboard" && <Dashboard courseId={courseId} />}
        {current === "sessions" && (
          <Panel>
            <Heading>Past Sessions</Heading>
            {data.sessions.length === 0 ? (
              <EmptyState title="No Sessions yet">Sessions you run appear here, with how many students took part.</EmptyState>
            ) : (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b-2 border-parchment-dark">
                      <th className="py-2 pr-3">When</th>
                      <th className="pr-3">Mode</th>
                      <th className="pr-3 text-right">Rounds</th>
                      <th className="pr-3 text-right">Students</th>
                      <th className="pr-3">Status</th>
                      <th className="text-right">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sessions.map((s) => (
                      <tr key={s.id} className="border-t border-parchment-dark">
                        <td className="py-2 pr-3">{new Date(s.createdAt).toLocaleString()}</td>
                        <td className="pr-3">{s.mode === "teams" ? "Teams" : "Solo"}</td>
                        <td className="pr-3 text-right">{s.rounds}</td>
                        <td className="pr-3 text-right">{s.participants}</td>
                        <td className="pr-3">
                          <Tag color={SESSION_STATUS[s.status].color}>{SESSION_STATUS[s.status].label}</Tag>
                        </td>
                        <td className="text-right">
                          {s.status !== "closed" && course.canRun ? (
                            <Link href={`/console/${s.id}`} className="font-bold underline underline-offset-2">
                              Open console
                            </Link>
                          ) : (
                            <Link href={`/teach/courses/${courseId}/sessions/${s.id}`} className="font-bold underline underline-offset-2">
                              View summary
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )}
      </div>
    </PageShell>
  );
}
