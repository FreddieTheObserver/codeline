"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/AppHeader";
import { SunTimer } from "@/components/garden/SunTimer";
import { Sprite } from "@/components/pixel/Sprite";
import { BLOOM, WILT } from "@/components/pixel/sprites";
import { Button, ErrorNote, Heading, LanguageTag, Loading, Meter, Panel, Tag, pct } from "@/components/ui";
import { errorText, post, useApi } from "@/lib/client";
import { serverOffset, useCountdown } from "@/lib/clock";
import type { ConsoleState, ControlAction } from "@/lib/api-types";
import { TEAM_COLORS, TEAM_NAMES } from "@/domain/teams";

export function Console({ sessionId }: { sessionId: string }) {
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

  async function act(action: ControlAction) {
    if (action === "close" && !window.confirm("Close this Session for everyone? Points become XP and the Session ends.")) return;
    setBusy(true);
    setActionError("");
    try {
      await post(`/api/sessions/${sessionId}/control`, { action });
      await mutate();
    } catch (err) {
      setActionError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function addBots() {
    setBusy(true);
    try {
      await post(`/api/sessions/${sessionId}/bots`, { count: botCount });
      await mutate();
    } catch (err) {
      setActionError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function spotlight(placementId: string) {
    try {
      await post(`/api/sessions/${sessionId}/spotlight`, { placementId });
      await mutate();
    } catch (err) {
      setActionError(errorText(err));
    }
  }

  async function rename(userId: string, current: string) {
    const nickname = window.prompt("New nickname for this student:", current);
    if (!nickname) return;
    try {
      await post(`/api/sessions/${sessionId}/rename`, { userId, nickname });
      await mutate();
    } catch (err) {
      setActionError(errorText(err));
    }
  }

  if (error) return <PageShell><ErrorNote>{error.message}</ErrorNote></PageShell>;
  if (!data) return <PageShell><Loading /></PageShell>;
  const { session, round } = data;
  const status = round?.timer.status;
  const hasNext = session.roundIndex + 1 < session.roundCount;

  return (
    <PageShell wide>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="flex flex-col gap-3">
          <Panel>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-pixel text-sm">
                  {session.courseCode} · {session.mode === "teams" ? `Teams of ${session.teamCount}` : "Solo"} · Hand of {session.handSize}
                </p>
                <Heading className="!text-2xl">Lecturer console</Heading>
                <p className="text-sm">Private: real names and reasons stay on this screen.</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold">Join code</p>
                <p className="font-mono text-2xl tracking-[0.25em]">{session.joinCode}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              <Button tone="water" onClick={() => window.open(`/projector/${sessionId}`, "codeline-projector")}>
                Open projector view
              </Button>
              {closed ? null : !round || (status !== "running" && status !== "paused" && hasNext) ? (
                <Button tone="sun" disabled={busy || !hasNext} onClick={() => act(round ? "next" : "start")}>
                  Start Round {session.roundIndex + 2}
                </Button>
              ) : null}
              {status === "running" && (
                <Button tone="secondary" disabled={busy} onClick={() => act("pause")}>
                  Pause
                </Button>
              )}
              {status === "paused" && (
                <Button disabled={busy} onClick={() => act("resume")}>
                  Resume
                </Button>
              )}
              {(status === "running" || status === "paused") && (
                <Button tone="secondary" disabled={busy} onClick={() => act("end")}>
                  End Round
                </Button>
              )}
              {round && status !== "revealed" && !closed && (
                <Button tone="secondary" disabled={busy} onClick={() => act("reveal")}>
                  Reveal solution
                </Button>
              )}
              {!closed && (
                <Button tone="danger" disabled={busy} onClick={() => act("close")}>
                  Close Session
                </Button>
              )}
            </div>
            <ErrorNote>{actionError}</ErrorNote>
          </Panel>

          {closed ? (
            <Panel>
              <Heading>This Session has closed</Heading>
              <p className="mt-1">Its results are in the Course dashboard.</p>
            </Panel>
          ) : (
            <Panel>
              <p className="mb-2 flex flex-wrap items-center gap-2 font-pixel text-xl">
                {round ? `Round ${round.position + 1}: ${round.exercise.title}` : "Lobby"}
                {round && <LanguageTag language={round.exercise.language} />}
              </p>
              {round ? <SunTimer timer={round.timer} left={left} /> : <p>{session.participants} students are waiting. Start when you&apos;re ready.</p>}
              <div className="mt-3">
                <Meter value={data.progress.placed} max={data.progress.dealt} color="#e9b949" label="Class progress" />
                <p className="mt-1 text-sm">
                  {data.progress.placed} of {data.progress.dealt} seeds planted · {session.participants} students
                </p>
              </div>
              <ol className="mt-3 flex flex-wrap gap-2 text-sm">
                {session.rounds.map((r) => (
                  <li key={r.position}>
                    <Tag color={r.status === "running" ? "#f6c445" : r.status === "pending" ? "#ecdcb6" : "#a4d77e"}>
                      {r.position + 1}. {r.exerciseTitle} · {Math.round(r.timeLimitS / 60)} min · {r.status}
                    </Tag>
                  </li>
                ))}
              </ol>
            </Panel>
          )}

          {data.stats.length > 0 && (
            <Panel>
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
                        <span>{pct(s.firstTryRate)} first try</span>
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
          )}

          {!closed && (
            <Panel className="!bg-[#eef3f8]">
              <p className="font-pixel">Demo tool: simulated students</p>
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
          )}
        </div>

        <div className="flex flex-col gap-3">
          <Panel>
            <Heading>Every decision, live</Heading>
            <p className="text-sm">Spotlight a good reason to pin it on the projector (+300 points).</p>
            <ul className="mt-2 flex max-h-[520px] flex-col gap-2 overflow-y-auto pr-1">
              {data.placements.length === 0 && <li className="text-sm">No Placements yet.</li>}
              {data.placements.map((p) => (
                <li key={p.id} className="bg-parchment-dark/60 p-2 text-sm" style={{ boxShadow: "0 0 0 2px #c9b48a" }}>
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
                        <button className="px-btn px-btn-sun !px-2 !py-0.5 text-xs" onClick={() => spotlight(p.id)}>
                          Spotlight
                        </button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel>
            <Heading>Students ({data.participants.length})</Heading>
            <div className="mt-2 max-h-[420px] overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-parchment">
                  <tr>
                    <th className="py-1 pr-2">Name</th>
                    <th className="pr-2">Nickname</th>
                    {session.mode === "teams" && <th className="pr-2">Farm</th>}
                    <th className="pr-2 text-right">Points</th>
                    <th className="pr-2 text-right">Planted</th>
                    <th className="text-right">Wrong</th>
                  </tr>
                </thead>
                <tbody>
                  {data.participants.map((p) => (
                    <tr key={p.userId} className="border-t border-parchment-dark">
                      <td className="py-1 pr-2">
                        {p.name} {p.isSimulated && <Tag className="ml-1">simulated</Tag>}
                        <span className="block text-xs text-ink-soft">{p.isSimulated ? "" : p.loginId}</span>
                      </td>
                      <td className="pr-2">
                        <button className="underline decoration-dotted" onClick={() => rename(p.userId, p.nickname)} title="Rename this nickname">
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
          <Link href="/teach" className="text-sm underline">
            Back to my courses
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
