"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageShell } from "@/components/AppHeader";
import { JoinQr } from "@/components/garden/JoinQr";
import { Sprite } from "@/components/pixel/Sprite";
import { SPROUT } from "@/components/pixel/sprites";
import { ButtonLink, ErrorNote, Heading, LanguageTag, Loading, Panel, SampleTag, Tag, Title, cx } from "@/components/ui";
import { errorText, post, useApi } from "@/lib/client";
import type { CourseDetail } from "@/lib/api-types";
import { Dashboard } from "./Dashboard";
import { SessionSetup } from "./SessionSetup";

type TabId = "exercises" | "run" | "dashboard" | "sessions";

export function CourseView({ courseId }: { courseId: string }) {
  const router = useRouter();
  const { data, error, mutate } = useApi<CourseDetail>(`/api/courses/${courseId}`, { refreshInterval: 10000 });
  const [tab, setTab] = useState<TabId>("exercises");
  const [actionError, setActionError] = useState("");

  if (error) return <PageShell><ErrorNote>{error.message}</ErrorNote></PageShell>;
  if (!data) return <PageShell><Loading /></PageShell>;
  const { course } = data;
  const tabs: { id: TabId; label: string; show: boolean }[] = [
    { id: "exercises", label: "Exercises", show: true },
    { id: "run", label: "Run a Session", show: course.canRun },
    { id: "dashboard", label: "Dashboard", show: true },
    { id: "sessions", label: "Past Sessions", show: true },
  ];

  async function duplicate(id: string) {
    try {
      const { id: copy } = await post<{ id: string }>(`/api/exercises/${id}/duplicate`);
      router.push(`/teach/exercises/${copy}`);
    } catch (err) {
      setActionError(errorText(err));
    }
  }

  return (
    <PageShell wide>
      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <Panel>
          <div className="flex flex-wrap items-center gap-2">
            <LanguageTag language={course.language} />
            {course.isSample && <SampleTag />}
          </div>
          <Title className="mt-2">
            {course.code} · {course.title}
          </Title>
          <p className="mt-1">
            {course.enrolled} students enrolled · {course.exercises} Exercises
          </p>
          {course.live && (
            <div className="mt-3 flex flex-wrap items-center gap-2 bg-[#fff3c4] p-2" style={{ boxShadow: "0 0 0 3px #e2a72e" }}>
              <Sprite grid={SPROUT} scale={3} />
              <span className="font-pixel">A Session is {course.live.status === "lobby" ? "waiting in the Lobby" : "live"}.</span>
              <ButtonLink href={`/console/${course.live.sessionId}`} tone="sun" className="!py-1">
                Open console
              </ButtonLink>
            </div>
          )}
        </Panel>
        <Panel className="flex items-center gap-4">
          <JoinQr code={course.joinCode} size={110} />
          <div>
            <p className="text-sm font-bold">Course join code</p>
            <p className="font-mono text-3xl tracking-[0.25em]">{course.joinCode}</p>
            <p className="max-w-[220px] text-xs">Students enter it once after signing up, or scan the code.</p>
          </div>
        </Panel>
      </div>

      <nav className="mt-4 flex flex-wrap gap-1" role="tablist" aria-label="Course sections">
        {tabs
          .filter((t) => t.show)
          .map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cx("px-btn", tab === t.id ? "px-btn-sun" : "px-btn-secondary")}
            >
              {t.label}
            </button>
          ))}
      </nav>
      <ErrorNote>{actionError}</ErrorNote>

      <div className="mt-3" role="tabpanel">
        {tab === "exercises" && (
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Heading>Exercises</Heading>
              {course.canEdit && <ButtonLink href={`/teach/courses/${courseId}/exercises/new`}>New Exercise</ButtonLink>}
            </div>
            <ul className="mt-3 flex flex-col gap-2">
              {data.exercises.length === 0 && <li>No Exercises yet.</li>}
              {data.exercises.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-3 bg-parchment-dark/50 p-2" style={{ boxShadow: "0 0 0 2px #c9b48a" }}>
                  <span className="font-pixel text-xl">{e.title}</span>
                  <LanguageTag language={e.language} />
                  <span className="text-sm">
                    {e.steps} steps · {e.dealable} dealt as seeds
                  </span>
                  {e.played && <Tag color="#a4d77e">played</Tag>}
                  <span className="ml-auto flex gap-1">
                    <ButtonLink href={`/teach/exercises/${e.id}`} tone="secondary" className="!py-1">
                      {course.canEdit ? "Edit" : "View"}
                    </ButtonLink>
                    {course.canEdit && (
                      <button className="px-btn px-btn-secondary !py-1" onClick={() => duplicate(e.id)}>
                        Duplicate
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
        {tab === "run" && <SessionSetup detail={data} onCreated={(id) => { void mutate(); router.push(`/console/${id}`); }} />}
        {tab === "dashboard" && <Dashboard courseId={courseId} />}
        {tab === "sessions" && (
          <Panel>
            <Heading>Past Sessions</Heading>
            <table className="mt-2 w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="py-1">When</th>
                  <th>Mode</th>
                  <th className="text-right">Rounds</th>
                  <th className="text-right">Students</th>
                  <th className="text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.sessions.map((s) => (
                  <tr key={s.id} className="border-t border-parchment-dark">
                    <td className="py-1">
                      <Link href={`/console/${s.id}`} className="underline">
                        {new Date(s.createdAt).toLocaleString()}
                      </Link>
                    </td>
                    <td>{s.mode === "teams" ? "Teams" : "Solo"}</td>
                    <td className="text-right">{s.rounds}</td>
                    <td className="text-right">{s.participants}</td>
                    <td className="text-right">{s.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        )}
      </div>
    </PageShell>
  );
}
