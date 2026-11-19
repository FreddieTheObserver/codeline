"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Board, type PlotView } from "@/components/garden/Board";
import { JoinQr } from "@/components/garden/JoinQr";
import { SunTimer } from "@/components/garden/SunTimer";
import { Avatar } from "@/components/pixel/Avatar";
import { Sprite } from "@/components/pixel/Sprite";
import { BASKET, BLOOM, CLOUD, SIGN, SPROUT, STAR, WILT } from "@/components/pixel/sprites";
import { ErrorNote, LanguageTag, Loading, Meter, Panel, Tag } from "@/components/ui";
import { useApi } from "@/lib/client";
import { serverOffset, useCountdown } from "@/lib/clock";
import { sfx } from "@/lib/sfx";
import type { ProjectorState } from "@/lib/api-types";

export function Projector({ sessionId }: { sessionId: string }) {
  const [offset, setOffset] = useState(0);
  const { data, error, mutate } = useApi<ProjectorState>(`/api/sessions/${sessionId}/projector`, {
    refreshInterval: 1000,
    onSuccess: (d) => setOffset(serverOffset(d.serverNow, Date.now())),
  });
  const [sound, setSound] = useState(false);
  const left = useCountdown(data?.round?.timer, offset, () => void mutate());

  const placed = data?.progress.placed ?? 0;
  const lastPlaced = useRef(placed);
  const lastStatus = useRef<string | null>(null);
  useEffect(() => {
    if (sound && placed > lastPlaced.current) sfx.sprout();
    lastPlaced.current = placed;
  }, [placed, sound]);
  const status = data?.round?.timer.status ?? null;
  useEffect(() => {
    if (sound && lastStatus.current && status !== lastStatus.current) {
      if (status === "running" && lastStatus.current !== "paused") sfx.roundStart();
      if (status === "ended") sfx.harvest();
    }
    lastStatus.current = status;
  }, [status, sound]);

  const plots: PlotView[] = useMemo(
    () =>
      (data?.round?.slots ?? []).map((s) => ({
        id: s.id,
        position: s.position,
        pseudocode: s.pseudocode,
        indent: s.indent,
        code: s.code,
        state: s.given ? "given" : data?.round?.revealed ? "revealed" : "class",
        rate: s.firstTryRate,
        placedCorrect: s.placedCorrect,
      })),
    [data?.round],
  );

  if (error) return <main className="p-6"><ErrorNote>{error.message}</ErrorNote></main>;
  if (!data) return <Loading />;
  const { session, round } = data;
  const lobby = !round && session.status !== "closed";

  return (
    <main className="flex min-h-screen flex-col gap-3 p-4 text-[17px]" style={{ background: "linear-gradient(#8fcbea 0, #bfe3f5 180px, #7cbf5a 180px)" }}>
      <header className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3">
          <Sprite grid={BLOOM} scale={4} />
          <div>
            <p className="font-pixel text-lg">
              {session.courseCode} · {session.roundIndex >= 0 ? `Round ${session.roundIndex + 1} of ${session.roundCount}` : `${session.roundCount} Rounds today`}
            </p>
            <p className="flex items-center gap-3 font-pixel text-4xl">
              {round?.exercise.title ?? session.courseTitle}
              {round && <LanguageTag language={round.exercise.language} />}
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {!lobby && (
            <Panel className="!m-1 !py-1 text-center">
              <p className="text-xs font-bold">Join code</p>
              <p className="font-mono text-2xl tracking-[0.25em]">{session.joinCode}</p>
            </Panel>
          )}
          <button onClick={() => setSound(!sound)} className="px-btn px-btn-secondary !px-2 !py-1 text-xs" aria-pressed={sound}>
            Sound {sound ? "on" : "off"}
          </button>
          <FullscreenButton />
        </div>
      </header>

      {lobby ? (
        <LobbyGate data={data} />
      ) : session.status === "closed" ? (
        <Finale data={data} />
      ) : (
        <>
          <SunTimer timer={round!.timer} left={left} big />
          <div className="grid flex-1 gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
            <Panel className="!p-3">
              {round!.timer.status === "paused" && <p className="mb-2 text-center font-pixel text-2xl">Paused</p>}
              {round!.revealed && <p className="mb-2 text-center font-pixel text-2xl">The full solution</p>}
              <Board plots={plots} big />
            </Panel>
            <div className="flex flex-col gap-3">
              <Panel>
                <div className="flex items-center gap-3">
                  <Sprite grid={BASKET} scale={5} />
                  <div className="flex-1">
                    <p className="font-pixel text-xl">Harvest basket</p>
                    <Meter value={data.progress.placed} max={data.progress.dealt} color="#e9b949" label="Class progress" />
                    <p className="mt-1 text-sm">
                      {data.progress.placed} of {data.progress.dealt} seeds planted by {session.participants} gardeners
                    </p>
                  </div>
                </div>
              </Panel>
              {data.teams.length > 0 && <TeamsPanel data={data} />}
              <Noticeboard data={data} />
              {data.spotlight && (
                <Panel className="!bg-[#fff3c4]">
                  <p className="font-pixel text-sm">Pinned by your lecturer · step {data.spotlight.step}</p>
                  <p className="mt-1 text-xl font-bold">&ldquo;{data.spotlight.reason}&rdquo;</p>
                  <p className="text-sm">{data.spotlight.nickname} · {data.spotlight.pseudocode}</p>
                </Panel>
              )}
              <Panel>
                <p className="font-pixel">Just now</p>
                <ul className="mt-1 flex flex-col gap-1" aria-live="polite">
                  {data.feed.length === 0 && <li className="text-sm">Waiting for the first seed...</li>}
                  {data.feed.map((f, i) => (
                    <li key={`${f.at}-${i}`} className="flex items-center gap-2 text-sm">
                      <Sprite grid={f.kind === "sprout" ? SPROUT : WILT} scale={2} />
                      <span>
                        <strong>{f.nickname}</strong> {f.kind === "sprout" ? "grew a sprout" : "tried again"}
                      </span>
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>
          </div>
        </>
      )}
    </main>
  );
}

function subscribeFullscreen(onChange: () => void) {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
}
const subscribeNever = () => () => {};

// Hidden where the page can't go fullscreen, such as Safari on iPhone.
function FullscreenButton() {
  const supported = useSyncExternalStore(subscribeNever, () => document.fullscreenEnabled, () => false);
  const on = useSyncExternalStore(subscribeFullscreen, () => document.fullscreenElement !== null, () => false);
  if (!supported) return null;
  const toggle = () => void (on ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {});
  return (
    <button type="button" onClick={toggle} className="px-btn px-btn-secondary !px-2 !py-1 text-xs">
      {on ? "Exit fullscreen" : "Fullscreen"}
    </button>
  );
}

// The lobby fills the screen: the QR code grows with the room's screen so the back row can still scan it.
const QR_SIZE = "clamp(220px, min(100dvh - 27rem, 42vw), 960px)";

function LobbyGate({ data }: { data: ProjectorState }) {
  return (
    <div className="grid flex-1 gap-4 lg:grid-cols-[auto_minmax(0,1fr)]">
      <Panel className="flex flex-col items-center justify-center gap-3 p-6">
        <p className="font-pixel text-4xl">Scan to join</p>
        <JoinQr code={data.session.joinCode} size={QR_SIZE} captionClassName="text-xl" />
        <p className="text-center text-xl">or enter the join code</p>
        <p className="pl-[0.3em] font-mono text-[clamp(3rem,6vw,7rem)] leading-none tracking-[0.3em]">{data.session.joinCode}</p>
      </Panel>
      <Panel className="relative flex min-h-[420px] flex-col overflow-hidden p-6">
        <div className="absolute right-6 top-4 opacity-70">
          <Sprite grid={CLOUD} scale={6} />
        </div>
        <p className="font-pixel text-5xl">The gate is open</p>
        <p className="mt-2 text-2xl">
          {data.session.participants} {data.session.participants === 1 ? "gardener has" : "gardeners have"} arrived. The first Round starts soon.
        </p>
        <ul className="mt-6 flex flex-wrap gap-3">
          {data.lobbyNames.map((n, i) => (
            <li
              key={`${n}-${i}`}
              className="anim-sprout flex items-center gap-[0.3em] bg-parchment-dark px-[0.5em] py-[0.2em] font-pixel text-[clamp(1rem,1.25vw,1.5rem)]"
              style={{ boxShadow: "0 0 0 3px #3b2a1e", animationDelay: `${(i % 12) * 40}ms` }}
            >
              <Sprite grid={SPROUT} scale={2} />
              {n}
            </li>
          ))}
        </ul>
        <div className="mt-auto flex items-end gap-3 pt-6">
          <Sprite grid={SIGN} scale={5} />
          <p className="max-w-xl text-lg">Read each signpost: it is one step of the algorithm in plain words. Plant your seed in the plot where its code belongs.</p>
        </div>
      </Panel>
    </div>
  );
}

function Noticeboard({ data }: { data: ProjectorState }) {
  return (
    <section className="px-panel px-panel-wood p-4">
      <p className="font-pixel text-xl">Town noticeboard</p>
      <ol className="mt-2 flex flex-col gap-2">
        {data.top.length === 0 && <li className="text-sm">No points yet. Be the first to bloom!</li>}
        {data.top.map((p, i) => (
          <li key={`${p.nickname}-${i}`} className="flex items-center gap-3 bg-parchment px-2 py-1 text-ink" style={{ boxShadow: "0 0 0 3px #5e3b26" }}>
            <span className="w-6 font-pixel text-2xl">{i + 1}</span>
            <Avatar avatar={p.avatar} scale={2} />
            <span className="flex-1 truncate font-pixel text-xl">{p.nickname}</span>
            <Tag>Lv {p.level}</Tag>
            <span className="flex items-center gap-1 font-pixel text-xl">
              <Sprite grid={STAR} scale={2} />
              {p.points.toLocaleString()}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-xs opacity-90">Everyone else can see their own rank on their device.</p>
    </section>
  );
}

function TeamsPanel({ data }: { data: ProjectorState }) {
  const best = Math.max(1, ...data.teams.map((t) => t.score));
  return (
    <Panel>
      <p className="font-pixel text-xl">Farms</p>
      <ul className="mt-2 flex flex-col gap-2">
        {data.teams.map((t) => (
          <li key={t.index}>
            <div className="flex justify-between text-sm font-bold">
              <span>
                {t.name} <span className="font-normal">({t.members})</span>
              </span>
              <span>{t.score.toLocaleString()}</span>
            </div>
            <Meter value={t.score} max={best} color={t.color} label={`${t.name} average points`} />
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs">A farm scores its members&apos; average, so bigger farms have no edge.</p>
    </Panel>
  );
}

function Finale({ data }: { data: ProjectorState }) {
  return (
    <div className="grid flex-1 items-start gap-4 lg:grid-cols-2">
      <Panel className="flex flex-col items-center gap-3 py-10 text-center">
        <Sprite grid={BASKET} scale={8} />
        <p className="font-pixel text-5xl">Harvest festival!</p>
        <p className="text-lg">Thanks for gardening today. Your points became XP.</p>
      </Panel>
      <Noticeboard data={data} />
    </div>
  );
}
