"use client";

import Link from "next/link";
import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Sprite } from "@/components/pixel/Sprite";
import { BLOOM, WILT } from "@/components/pixel/sprites";
import { ButtonLink, EmptyState, ErrorState, Heading, LanguageTag, Loading, Meter, PageHeader, Panel, Stat, Tag, pct } from "@/components/ui";
import { useApi } from "@/lib/client";
import type { SessionReport, SessionReportRound } from "@/lib/api-types";
import { TEAM_COLORS, TEAM_NAMES } from "@/domain/teams";
import { StepBars } from "../../StepBars";
import { courseHref } from "../../tabs";

const NUMBER_CELL = "whitespace-nowrap px-2 text-right tabular-nums";
const dateTime = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
const clock = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { timeStyle: "short" });

export function SessionReportView({ courseId, sessionId }: { courseId: string; sessionId: string }) {
  const { data, error } = useApi<SessionReport>(`/api/courses/${courseId}/sessions/${sessionId}`);
  const [roundIndex, setRoundIndex] = useState(0);
  const [hideSimulated, setHideSimulated] = useState(false);
  const pastSessions = courseHref(courseId, "sessions");

  if (error) return <PageShell><ErrorState message={error.message} backHref={pastSessions} backLabel="Back to Past Sessions" /></PageShell>;
  if (!data) return <PageShell><Loading label="Gathering the harvest..." /></PageShell>;
  const { session, course, rounds, teams } = data;
  const round = rounds[roundIndex] ?? rounds[0];
  const everyPlacement = rounds.flatMap((r) => r.placements);
  const corrects = everyPlacement.filter((p) => p.correct);
  const placed = rounds.reduce((n, r) => n + r.progress.placed, 0);
  const dealt = rounds.reduce((n, r) => n + r.progress.dealt, 0);
  const students = data.students.filter((s) => !hideSimulated || !s.isSimulated);
  const live = session.status !== "closed";

  return (
    <PageShell>
      <PageHeader
        breadcrumbs={[
          { label: "My courses", href: "/teach" },
          { label: course.code, href: courseHref(courseId) },
          { label: "Past Sessions", href: pastSessions },
          { label: dateTime(session.createdAt) },
        ]}
        tags={live ? <Tag color="#f6c445">{session.status === "lobby" ? "In the Lobby" : "Still running"}</Tag> : undefined}
        title="Session summary"
        description={
          `${dateTime(session.createdAt)}${session.closedAt ? ` to ${clock(session.closedAt)}` : ""} · ` +
          `${session.mode === "teams" ? "Teams" : "Solo"} · Hand of ${session.handSize}` +
          (live ? ". It's still open, so this shows it so far." : "")
        }
        actions={
          live && session.canRun ? (
            <ButtonLink href={`/console/${session.id}`} tone="water">
              Open the live console
            </ButtonLink>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Students" value={data.students.length} />
        <Stat label="Seeds planted" value={`${placed} of ${dealt}`} />
        <Stat label="Right first try" value={pct(corrects.length ? corrects.filter((p) => p.attempt === 1).length / corrects.length : null)} />
        <Stat label="Reasons given" value={everyPlacement.filter((p) => p.reason).length} />
      </div>

      {rounds.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-1" role="group" aria-label="Rounds">
          {rounds.map((r, i) => (
            <button
              key={r.position}
              type="button"
              aria-pressed={r === round}
              className={`px-btn !py-1 text-sm ${r === round ? "px-btn-sun" : "px-btn-secondary"}`}
              onClick={() => setRoundIndex(i)}
            >
              Round {r.position + 1}: {r.exerciseTitle}
            </button>
          ))}
        </div>
      )}

      {round ? <RoundReport key={round.position} round={round} /> : <Panel className="mt-4"><EmptyState title="No Rounds">This Session had no Rounds.</EmptyState></Panel>}

      {teams.length > 0 && (
        <Panel className="mt-4">
          <Heading>Farms</Heading>
          <ul className="mt-2 flex flex-col gap-2">
            {teams.map((t) => (
              <li key={t.index} className="flex flex-wrap items-center gap-2 text-sm">
                <Tag color={t.color}>{t.name}</Tag>
                <span>
                  {t.members} {t.members === 1 ? "student" : "students"} · <strong>{t.score.toLocaleString()}</strong> average points
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Heading>Students ({data.students.length})</Heading>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={hideSimulated} onChange={(e) => setHideSimulated(e.target.checked)} /> Hide simulated students
          </label>
        </div>
        {data.students.length === 0 ? (
          <EmptyState title="Nobody joined">No students joined this Session.</EmptyState>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b-2 border-parchment-dark">
                  <th className="py-2 pr-2 text-right">#</th>
                  <th className="px-2">Name</th>
                  <th className="px-2">Nickname</th>
                  {session.mode === "teams" && <th className="px-2">Farm</th>}
                  <th className={NUMBER_CELL}>Points</th>
                  <th className={NUMBER_CELL}>Planted</th>
                  <th className={NUMBER_CELL}>Wrong</th>
                  <th className={NUMBER_CELL}>First try</th>
                  <th className={NUMBER_CELL}>Reasons</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.userId} className="border-t border-parchment-dark">
                    <td className="py-1.5 pr-2 text-right tabular-nums">{s.rank}</td>
                    <td className="px-2">
                      <span className="flex items-center justify-between gap-2">
                        <Link href={`/teach/courses/${courseId}/students/${s.userId}`} className="font-bold underline">
                          {s.name}
                        </Link>
                        {s.isSimulated && <Tag className="shrink-0">simulated</Tag>}
                      </span>
                    </td>
                    <td className="px-2">{s.nickname}</td>
                    {session.mode === "teams" && (
                      <td className="px-2">
                        {s.team !== null && <Tag color={TEAM_COLORS[s.team % TEAM_COLORS.length]}>{TEAM_NAMES[s.team % TEAM_NAMES.length].split(" ")[0]}</Tag>}
                      </td>
                    )}
                    <td className={`${NUMBER_CELL} font-bold`}>{s.points.toLocaleString()}</td>
                    <td className={NUMBER_CELL}>
                      {s.placed}/{s.dealt}
                    </td>
                    <td className={NUMBER_CELL}>{s.wrong}</td>
                    <td className={NUMBER_CELL}>{pct(s.firstTryRate)}</td>
                    <td className={NUMBER_CELL}>{s.reasons}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </PageShell>
  );
}

// A Round can hold a few hundred decisions, far too long a page on a phone, so the rest wait behind a button.
const FIRST_DECISIONS = 30;

function RoundReport({ round }: { round: SessionReportRound }) {
  const [reasonsOnly, setReasonsOnly] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const withReason = round.placements.filter((p) => p.reason);
  const matching = reasonsOnly ? withReason : round.placements;
  const shown = showAll ? matching : matching.slice(0, FIRST_DECISIONS);
  const played = round.status !== "pending";

  return (
    <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <Panel>
        <p className="flex flex-wrap items-center gap-2 font-pixel text-xl">
          Round {round.position + 1}: {round.exerciseTitle}
          <LanguageTag language={round.language} />
        </p>
        {played ? (
          <>
            <p className="mt-1 text-sm">
              {round.startedAt ? `Started ${clock(round.startedAt)}` : "Started"}
              {round.endedAt ? `, ended ${clock(round.endedAt)}` : ""} · {Math.round(round.timeLimitS / 60)} min limit
            </p>
            <div className="mt-2">
              <Meter value={round.progress.placed} max={round.progress.dealt} color="#e9b949" label="Seeds planted" />
              <p className="mt-1 text-sm">
                {round.progress.placed} of {round.progress.dealt} seeds planted
              </p>
            </div>
            <Heading className="mt-4">Hardest steps</Heading>
            <p className="text-sm">Share of students right on the first try, and where they most often put the line instead.</p>
            <StepBars steps={round.steps} />
          </>
        ) : (
          <EmptyState title="Not played">The Session closed before this Round started.</EmptyState>
        )}
      </Panel>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Heading>Decisions ({round.placements.length})</Heading>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={reasonsOnly} onChange={(e) => setReasonsOnly(e.target.checked)} /> Only with a reason ({withReason.length})
          </label>
        </div>
        <ul className="mt-2 flex flex-col gap-2 lg:max-h-[640px] lg:overflow-y-auto lg:pr-1">
          {shown.length === 0 && (
            <li className="px-row px-3 py-4 text-center text-sm">{reasonsOnly ? "Nobody gave a reason in this Round." : "Nobody planted a seed in this Round."}</li>
          )}
          {shown.map((p) => (
            <li key={p.id} className="px-row p-2 text-sm">
              <div className="flex items-center gap-2">
                <Sprite grid={p.correct ? BLOOM : WILT} scale={2} />
                <span className="font-bold">{p.name}</span>
                <span className="text-ink-soft">({p.nickname})</span>
                <span className="ml-auto text-xs">{clock(p.at)}</span>
              </div>
              <p className="mt-1">
                <code className="bg-[#fffdf6] px-1 font-mono">{p.snippet}</code> → step {p.slotPosition} ({p.slotPseudocode}) ·{" "}
                {p.correct ? <strong className="text-leaf-dark">right</strong> : <strong className="text-berry-dark">wrong</strong>}
                {p.attempt > 1 && ` on try ${p.attempt}`}
              </p>
              {p.reason && (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <q className="italic">{p.reason}</q>
                  {p.spotlighted && <Tag color="#f6c445">Spotlighted</Tag>}
                </div>
              )}
            </li>
          ))}
        </ul>
        {matching.length > shown.length && (
          <button type="button" className="px-btn px-btn-secondary mt-2 !py-1 text-sm" onClick={() => setShowAll(true)}>
            Show all {matching.length} decisions
          </button>
        )}
      </Panel>
    </div>
  );
}
