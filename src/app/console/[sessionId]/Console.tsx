"use client";

import { useEffect, useState } from "react";
import { useConfirm, usePrompt, useToast } from "@/components/feedback";
import { SunTimer } from "@/components/garden/SunTimer";
import { PageShell } from "@/components/PageShell";
import { Sprite } from "@/components/pixel/Sprite";
import { BLOOM, WILT } from "@/components/pixel/sprites";
import { Button, ButtonLink, EmptyState, ErrorNote, ErrorState, Heading, LanguageTag, Loading, Meter, PageHeader, Panel, Tag, cx, pct } from "@/components/ui";
import { errorText, post, useApi } from "@/lib/client";
import { formatClock, serverOffset, useCountdown } from "@/lib/clock";
import type { ConsolePlacement, ConsoleState, ControlAction, RoundStatus } from "@/lib/api-types";
import { TEAM_COLORS, TEAM_NAMES } from "@/domain/teams";
import { courseHref } from "@/app/teach/courses/[courseId]/tabs";

const ROUND_STATUS: Record<RoundStatus, { label: string; color: string }> = {
  pending: { label: "up next", color: "#ecdcb6" },
  running: { label: "running", color: "#f6c445" },
  paused: { label: "paused", color: "#f6c445" },
  ended: { label: "ended", color: "#a4d77e" },
  revealed: { label: "revealed", color: "#a4d77e" },
};

export function Console({ sessionId }: { sessionId: string }) {
  const confirm = useConfirm();
  const prompt = usePrompt();
  const toast = useToast();
  const [offset, setOffset] = useState(0);
  const { data, error, mutate } = useApi<ConsoleState>(`/api/sessions/${sessionId}/console`, {
    refreshInterval: 1500,
    onSuccess: (d) => setOffset(serverOffset(d.serverNow, Date.now())),
  });
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [botsOn, setBotsOn] = useState(true);
  const [botCount, setBotCount] = useState(20);
  const left = useCountdown(data?.round?.timer, offset, () => void mutate());
  const closed = data?.session.status === "closed";

  // The console drives time-based work: settling the deadline and moving simulated students.
  // Each tick waits for the previous one, so slow ticks never pile up.
  useEffect(() => {
    if (closed) return;
    let stopped = false;
    let timer = 0;
    const loop = async () => {
      try {
        await fetch(`/api/sessions/${sessionId}/tick?bots=${botsOn ? 1 : 0}`, { method: "POST" });
      } catch {}
      if (!stopped) timer = window.setTimeout(loop, 1500);
    };
    timer = window.setTimeout(loop, 1500);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [sessionId, botsOn, closed]);

  if (error) return <PageShell><ErrorState message={error.message} backHref="/teach" backLabel="Back to my courses" /></PageShell>;
  if (!data) return <PageShell><Loading /></PageShell>;
  const { session, round } = data;
  const status = round?.timer.status;
  const roundNo = (round?.position ?? 0) + 1;
  const nextNo = session.roundIndex + 2;
  const hasNext = session.roundIndex + 1 < session.roundCount;
  const live = status === "running" || status === "paused";

  async function run(action: ControlAction, done: string) {
    setBusy(true);
    setActionError("");
    try {
      await post(`/api/sessions/${sessionId}/control`, { action });
      await mutate();
      toast(done);
    } catch (err) {
      setActionError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function start() {
    if (status === "ended") {
      const ok = await confirm({
        title: `Start Round ${nextNo} without revealing?`,
        body: `The class hasn't seen the solution to Round ${roundNo} yet. Once the next Round starts, you can't reveal it any more.`,
        confirmLabel: "Start without revealing",
        cancelLabel: "Not yet",
        tone: "sun",
      });
      if (!ok) return;
    }
    await run(round ? "next" : "start", `Round ${round ? nextNo : 1} has started. The sun is rising.`);
  }

  async function endRound() {
    const ok = await confirm({
      title: `End Round ${roundNo} now?`,
      body: "Every student stops planting straight away. Points earned so far are kept, and you can reveal the solution next.",
      confirmLabel: "End Round",
      tone: "danger",
    });
    if (ok) await run("end", `Round ${roundNo} has ended.`);
  }

  async function reveal() {
    if (live) {
      const ok = await confirm({
        title: "Reveal the solution now?",
        body: `Round ${roundNo} is still ${status}. Revealing ends it for everyone and shows every plot's right line on the projector and on students' devices.`,
        confirmLabel: "Reveal solution",
        tone: "danger",
      });
      if (!ok) return;
    }
    await run("reveal", "The solution is on the projector.");
  }

  async function closeSession() {
    const ok = await confirm({
      title: "Close this Session?",
      body: (
        <>
          <p>The Session ends for everyone, each student&apos;s points become XP, and it moves to Past Sessions. This can&apos;t be undone.</p>
          {live && <p className="font-bold">Round {roundNo} is still {status}; it ends now.</p>}
          {!live && hasNext && (
            <p className="font-bold">
              {session.roundCount - session.roundIndex - 1 === 1 ? "1 planned Round won't" : `${session.roundCount - session.roundIndex - 1} planned Rounds won't`} be played.
            </p>
          )}
        </>
      ),
      confirmLabel: "Close Session",
      tone: "danger",
    });
    if (ok) await run("close", "The Session is closed. Points became XP.");
  }

  async function addBots() {
    const ok = await confirm({
      title: `Add ${botCount} simulated students?`,
      body: "They join this Session for the demo, appear on the projector by nickname, and show up in results marked “simulated”. They can't be removed afterwards.",
      confirmLabel: "Add simulated students",
      tone: "water",
    });
    if (!ok) return;
    setBusy(true);
    setActionError("");
    try {
      const { added } = await post<{ added: number }>(`/api/sessions/${sessionId}/bots`, { count: botCount });
      await mutate();
      toast(added > 0 ? `Added ${added} simulated ${added === 1 ? "student" : "students"}.` : "Every simulated student is already in this Session.");
    } catch (err) {
      setActionError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function spotlight(p: ConsolePlacement) {
    const ok = await confirm({
      title: "Spotlight this reason?",
      body: (
        <>
          <blockquote className="px-row px-3 py-2 italic">&ldquo;{p.reason}&rdquo;</blockquote>
          <p>
            It&apos;s pinned on the projector under <strong>{p.nickname}</strong>, and they get +300 points. This can&apos;t be undone.
          </p>
        </>
      ),
      confirmLabel: "Pin on the projector",
      tone: "sun",
    });
    if (!ok) return;
    setActionError("");
    try {
      await post(`/api/sessions/${sessionId}/spotlight`, { placementId: p.id });
      await mutate();
      toast(`${p.nickname}'s reason is pinned on the projector.`);
    } catch (err) {
      setActionError(errorText(err));
    }
  }

  async function rename(userId: string, current: string) {
    const nickname = await prompt({
      title: `Rename ${current}`,
      body: "Use this for a rude or confusing nickname. The new one shows on the projector straight away and replaces the student's nickname everywhere.",
      label: "New nickname",
      initial: current,
      maxLength: 20,
      confirmLabel: "Rename",
    });
    if (!nickname || nickname === current) return;
    setActionError("");
    try {
      await post(`/api/sessions/${sessionId}/rename`, { userId, nickname });
      await mutate();
      toast(`${current} is now ${nickname}.`);
    } catch (err) {
      setActionError(errorText(err));
    }
  }

  // The panel shows full labels on a laptop; the phone bar uses short ones to fit one thumb-width row.
  const roundButtons = (short: boolean) => (
    <>
      {(!round || (!live && hasNext)) && (
        <Button tone={!round || status === "revealed" ? "sun" : "secondary"} disabled={busy} onClick={start}>
          Start Round {round ? nextNo : 1}
        </Button>
      )}
      {status === "running" && (
        <Button tone="secondary" disabled={busy} onClick={() => run("pause", "Round paused.")}>
          Pause
        </Button>
      )}
      {status === "paused" && (
        <Button disabled={busy} onClick={() => run("resume", "Round resumed.")}>
          Resume
        </Button>
      )}
      {live && (
        <Button tone="secondary" disabled={busy} onClick={endRound}>
          {short ? "End" : "End Round"}
        </Button>
      )}
      {round && status !== "revealed" && (
        <Button tone={status === "ended" ? "sun" : "secondary"} disabled={busy} onClick={reveal}>
          {short ? "Reveal" : "Reveal solution"}
        </Button>
      )}
    </>
  );

  const hardestSteps = (className: string) =>
    data.stats.length > 0 && (
      <Panel className={className}>
        <Heading>Hardest steps right now</Heading>
        <ul className="mt-2 flex flex-col gap-2">
          {[...data.stats]
            .filter((s) => s.heldBy > 0)
            .sort((a, b) => (a.firstTryRate ?? 1) - (b.firstTryRate ?? 1))
            .slice(0, 5)
            .map((s) => (
              <li key={s.slotId} className="text-sm">
                <div className="flex justify-between gap-2 font-bold">
                  <span>
                    Step {s.position + 1}: {s.pseudocode}
                  </span>
                  <span className="whitespace-nowrap">{pct(s.firstTryRate)} first try</span>
                </div>
                {s.commonWrong && (
                  <p className="text-xs text-ink-soft">
                    {Math.round(s.commonWrong.share * 100)}% of holders put it at step {s.commonWrong.position + 1} ({s.commonWrong.pseudocode}) first.
                  </p>
                )}
              </li>
            ))}
        </ul>
      </Panel>
    );

  const demoTool = (className: string) =>
    !closed && (
      <Panel className={cx("!bg-[#eef3f8]", className)}>
        <Heading>Demo tool: simulated students</Heading>
        <p className="text-xs">For demos only. Simulated students are marked in every table and export.</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            type="number"
            min={1}
            max={60}
            value={botCount}
            onChange={(e) => setBotCount(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
            className="px-input !w-20"
            aria-label="How many simulated students"
          />
          <Button tone="water" disabled={busy} onClick={addBots}>
            Add
          </Button>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={botsOn} onChange={(e) => setBotsOn(e.target.checked)} /> They keep playing
          </label>
        </div>
      </Panel>
    );

  const barStatus = !round
    ? `Lobby · ${session.participants} ${session.participants === 1 ? "student" : "students"}`
    : `Round ${roundNo} · ${status === "running" ? formatClock(left) : status === "revealed" ? "solution shown" : ROUND_STATUS[round.timer.status].label}`;

  const hint = closed
    ? "This Session has closed."
    : !round
      ? `${session.participants} ${session.participants === 1 ? "student is" : "students are"} waiting in the Lobby. Start when you're ready.`
      : status === "running"
        ? `Round ${roundNo} is running.`
        : status === "paused"
          ? "Paused. Students can't plant until you resume."
          : status === "ended"
            ? `Round ${roundNo} has ended. Reveal the solution to talk it through.`
            : hasNext
              ? `The solution is shown. Start Round ${nextNo} when the class is ready.`
              : "That was the last Round. Close the Session to turn points into XP.";

  return (
    <PageShell>
      <PageHeader
        breadcrumbs={[{ label: "My courses", href: "/teach" }, { label: session.courseCode, href: courseHref(session.courseId) }, { label: "Live console" }]}
        title="Live console"
        description={`${session.courseCode} · ${session.mode === "teams" ? `Teams of ${session.teamCount}` : "Solo"} · Hand of ${session.handSize}. Private: real names and reasons stay on this screen.`}
        actions={
          <>
            <div className="mr-2 text-right">
              <p className="text-xs font-bold">Join code</p>
              <p className="font-mono text-2xl leading-none tracking-[0.25em]">{session.joinCode}</p>
            </div>
            <Button tone="water" onClick={() => window.open(`/projector/${sessionId}`, "codeline-projector")}>
              Open projector view
            </Button>
          </>
        }
      />

      {/* Below lg the columns stack, so on a phone the decisions list comes before the slower-moving panels
          and the Round buttons live in a bar pinned to the bottom instead of in this panel. */}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="flex flex-col gap-4">
          <Panel id="round-controls">
            <Heading>Round controls</Heading>
            <p className="mt-1 text-sm" role="status">
              {hint}
            </p>
            {!closed && <div className="mt-3 hidden flex-wrap gap-1 lg:flex">{roundButtons(false)}</div>}
            <div className={cx(!closed && "hidden lg:block")}>
              <ErrorNote>{actionError}</ErrorNote>
            </div>
            {!closed && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t-2 border-parchment-dark pt-3">
                <p className="text-xs text-ink-soft">Closing ends the Session for everyone and turns points into XP.</p>
                <Button tone="danger" disabled={busy} onClick={closeSession}>
                  Close Session
                </Button>
              </div>
            )}
          </Panel>

          {closed ? (
            <Panel>
              <EmptyState
                title="This Session has closed"
                action={
                  <ButtonLink href={courseHref(session.courseId, "dashboard")} tone="secondary">
                    See the course dashboard
                  </ButtonLink>
                }
              >
                Every decision below is kept, and the results are in the course dashboard.
              </EmptyState>
            </Panel>
          ) : (
            <Panel>
              <p className="mb-2 flex flex-wrap items-center gap-2 font-pixel text-xl">
                {round ? `Round ${roundNo}: ${round.exercise.title}` : "Lobby"}
                {round && <LanguageTag language={round.exercise.language} />}
              </p>
              {round && <SunTimer timer={round.timer} left={left} />}
              <div className="mt-3">
                <Meter value={data.progress.placed} max={data.progress.dealt} color="#e9b949" label="Class progress" />
                <p className="mt-1 text-sm">
                  {data.progress.placed} of {data.progress.dealt} seeds planted · {session.participants} students
                </p>
              </div>
              <ol className="mt-3 flex flex-wrap gap-2 text-sm" aria-label="Rounds in this Session">
                {session.rounds.map((r) => (
                  <li key={r.position}>
                    <Tag color={ROUND_STATUS[r.status].color}>
                      {r.position + 1}. {r.exerciseTitle} · {Math.round(r.timeLimitS / 60)} min · {ROUND_STATUS[r.status].label}
                    </Tag>
                  </li>
                ))}
              </ol>
            </Panel>
          )}

          {hardestSteps("hidden lg:block")}
          {demoTool("hidden lg:block")}
        </div>

        <div className="flex flex-col gap-4">
          <Panel>
            <Heading>Every decision, live</Heading>
            <p className="text-sm">Spotlight a good reason to pin it on the projector (+300 points).</p>
            <ul className="mt-2 flex max-h-[520px] flex-col gap-2 overflow-y-auto pr-1">
              {data.placements.length === 0 && <li className="px-row px-3 py-4 text-center text-sm">No Placements yet. They appear here as students plant.</li>}
              {data.placements.map((p) => (
                <li key={p.id} className="px-row p-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Sprite grid={p.correct ? BLOOM : WILT} scale={2} />
                    <span className="font-bold">{p.name}</span>
                    <span className="text-ink-soft">({p.nickname})</span>
                    <span className="ml-auto text-xs">{new Date(p.at).toLocaleTimeString()}</span>
                  </div>
                  <p className="mt-1">
                    <code className="bg-[#fffdf6] px-1 font-mono">{p.snippet}</code> → step {p.slotPosition} ({p.slotPseudocode}) ·{" "}
                    {p.correct ? <strong className="text-leaf-dark">right</strong> : <strong className="text-berry-dark">wrong</strong>}
                    {p.attempt > 1 && ` on try ${p.attempt}`}
                  </p>
                  {p.reason && (
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <q className="italic">{p.reason}</q>
                      {p.spotlighted ? (
                        <Tag color="#f6c445">Spotlighted</Tag>
                      ) : (
                        <button type="button" className="px-btn px-btn-sun !px-2 !py-0.5 text-xs" onClick={() => spotlight(p)}>
                          Spotlight
                        </button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Panel>

          {hardestSteps("lg:hidden")}

          <Panel>
            <Heading>Students ({data.participants.length})</Heading>
            <p className="text-xs text-ink-soft">Select a nickname to rename it.</p>
            <div className="mt-2 max-h-[420px] overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-parchment">
                  <tr className="border-b-2 border-parchment-dark">
                    <th className="py-1 pr-2">Name</th>
                    <th className="pr-2">Nickname</th>
                    {session.mode === "teams" && <th className="pr-2">Farm</th>}
                    <th className="pr-2 text-right">Points</th>
                    <th className="pr-2 text-right">Planted</th>
                    <th className="text-right">Wrong</th>
                  </tr>
                </thead>
                <tbody>
                  {data.participants.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center">
                        Nobody has joined yet. Show the projector view so students can scan the code.
                      </td>
                    </tr>
                  )}
                  {data.participants.map((p) => (
                    <tr key={p.userId} className="border-t border-parchment-dark">
                      <td className="py-1 pr-2">
                        {p.name} {p.isSimulated && <Tag className="ml-1">simulated</Tag>}
                        <span className="block text-xs text-ink-soft">{p.isSimulated ? "" : p.loginId}</span>
                      </td>
                      <td className="pr-2">
                        <button
                          type="button"
                          className="underline decoration-dotted underline-offset-2"
                          onClick={() => rename(p.userId, p.nickname)}
                          aria-label={`Rename ${p.nickname}`}
                        >
                          {p.nickname}
                        </button>
                      </td>
                      {session.mode === "teams" && (
                        <td className="pr-2">
                          {p.team !== null && <Tag color={TEAM_COLORS[p.team % TEAM_COLORS.length]}>{TEAM_NAMES[p.team % TEAM_NAMES.length].split(" ")[0]}</Tag>}
                        </td>
                      )}
                      <td className="pr-2 text-right font-bold">{p.points.toLocaleString()}</td>
                      <td className="pr-2 text-right">
                        {p.placed}/{p.hand}
                      </td>
                      <td className="text-right">{p.wrong}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          {demoTool("lg:hidden")}
        </div>
      </div>

      {!closed && (
        <div className="sticky bottom-0 z-20 mt-4 lg:hidden">
          <div className="px-panel px-panel-wood !mx-1 !mb-1 p-2">
            <ErrorNote>{actionError}</ErrorNote>
            <div className="flex flex-wrap items-center justify-between gap-x-2">
              <p className="px-1 font-pixel text-lg">{barStatus}</p>
              <div className="flex flex-wrap justify-end gap-x-1">
                {status === "revealed" && !hasNext ? (
                  <a href="#round-controls" className="px-1 py-2 text-sm font-bold underline">
                    Close the Session
                  </a>
                ) : (
                  roundButtons(true)
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
