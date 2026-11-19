"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { mutate as refresh } from "swr";
import { Board, type PlotView } from "@/components/garden/Board";
import { HandTray } from "@/components/garden/HandTray";
import { PageShell } from "@/components/PageShell";
import { SunTimer } from "@/components/garden/SunTimer";
import { Avatar } from "@/components/pixel/Avatar";
import { Sprite } from "@/components/pixel/Sprite";
import { BADGE_ICONS, BASKET, BLOOM, SPROUT, STAR, WILT } from "@/components/pixel/sprites";
import { Button, ButtonLink, ErrorNote, ErrorState, Heading, LanguageTag, Loading, Panel, Tag } from "@/components/ui";
import { errorText, post, useApi } from "@/lib/client";
import { serverOffset, useCountdown } from "@/lib/clock";
import { useSessionPush } from "@/lib/realtime";
import { sfx } from "@/lib/sfx";
import type { BadgeEarned, PlaceResult, StudentState } from "@/lib/api-types";

type Feedback = { kind: "bloom" | "wilt"; text: string; placementId: string; slotPosition: number; key: number };

function readSound(): boolean {
  try {
    return window.localStorage.getItem("codeline-sound") === "on";
  } catch {
    return false;
  }
}

function subscribeStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

// Student devices start muted; the choice is remembered on this device only.
function useSound(): [boolean, (on: boolean) => void] {
  const stored = useSyncExternalStore(subscribeStorage, readSound, () => false);
  const [choice, setChoice] = useState<boolean | null>(null);
  const set = (value: boolean) => {
    setChoice(value);
    try {
      window.localStorage.setItem("codeline-sound", value ? "on" : "off");
    } catch {}
  };
  return [choice ?? stored, set];
}

export function Play({ sessionId }: { sessionId: string }) {
  const [offset, setOffset] = useState(0);
  const stateKey = `/api/sessions/${sessionId}/state`;
  const live = useSessionPush(sessionId, () => void refresh(stateKey));
  const { data, error, mutate } = useApi<StudentState>(stateKey, {
    refreshInterval: live ? 8000 : 2500,
    onSuccess: (d) => setOffset(serverOffset(d.serverNow, Date.now())),
  });

  const [selected, setSelected] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ slotId: string; kind: "bloom" | "wilt"; key: number } | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [reason, setReason] = useState("");
  const [reasonSaved, setReasonSaved] = useState(false);
  const [newBadges, setNewBadges] = useState<BadgeEarned[]>([]);
  const [joinError, setJoinError] = useState("");
  const [placeError, setPlaceError] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sound, setSound] = useSound();
  const joining = useRef(false);

  // A failed join waits for the student to try again rather than retrying on every poll.
  useEffect(() => {
    if (!data || data.me.joined || data.session.status === "closed" || joining.current || joinError) return;
    joining.current = true;
    post(`/api/sessions/${sessionId}/join`)
      .then(() => mutate())
      .catch((err) => setJoinError(errorText(err)))
      .finally(() => {
        joining.current = false;
      });
  }, [data, sessionId, mutate, joinError]);

  const round = data?.round ?? null;
  const left = useCountdown(round?.timer, offset, () => void mutate());

  const lastStatus = useRef<string | null>(null);
  const lastPlaceSound = useRef(0);
  useEffect(() => {
    const status = round?.timer.status ?? null;
    if (status === lastStatus.current) return;
    if (sound && lastStatus.current !== null) {
      if (status === "running" && lastStatus.current !== "paused") sfx.roundStart();
      // When your own last seed ends the Round, its harvest jingle is enough.
      if (status === "ended" && Date.now() - lastPlaceSound.current > 2000) sfx.roundEnd();
    }
    if (status === "running" && lastStatus.current !== "paused") {
      setFeedback(null);
      setSelected(null);
      setPlaceError("");
    }
    lastStatus.current = status;
  }, [round?.timer.status, sound]);

  const plots: PlotView[] = useMemo(
    () =>
      (round?.slots ?? []).map((s) => ({
        id: s.id,
        position: s.position,
        pseudocode: s.pseudocode,
        indent: s.indent,
        code: s.code,
        state: s.given ? "given" : round?.revealed && !round.hand.some((c) => c.placedSlotId === s.id) ? (s.code ? "revealed" : "empty") : s.code ? "mine" : "empty",
      })),
    [round],
  );

  const place = useCallback(
    async (slotId: string, cardId?: string) => {
      const card = cardId ?? selected;
      if (!card || !round || busy) return;
      setBusy(true);
      setPlaceError("");
      const slot = round.slots.find((s) => s.id === slotId);
      try {
        const result = await post<PlaceResult>(`/api/sessions/${sessionId}/place`, { cardId: card, slotId });
        const key = Date.now();
        setFlash({ slotId, kind: result.correct ? "bloom" : "wilt", key });
        setReason("");
        setReasonSaved(false);
        setReasonError("");
        setFeedback({
          kind: result.correct ? "bloom" : "wilt",
          text: result.correct
            ? `It bloomed! +${result.points} points${result.streak > 1 ? ` · streak x${result.streak}` : ""}`
            : "That plot isn't right for this seed. It wilted, so try another.",
          placementId: result.placementId,
          slotPosition: (slot?.position ?? 0) + 1,
          key,
        });
        if (result.badges.length) setNewBadges(result.badges);
        if (sound) {
          lastPlaceSound.current = Date.now();
          (result.correct ? (result.handDone ? sfx.harvest : sfx.sprout) : sfx.wilt)();
        }
        if (result.correct) setSelected(null);
        await mutate();
      } catch (err) {
        setPlaceError(errorText(err));
        await mutate();
      } finally {
        setBusy(false);
      }
    },
    [selected, round, busy, sessionId, sound, mutate],
  );

  async function saveReason() {
    if (!feedback || !reason.trim()) return;
    setReasonError("");
    try {
      const { badges } = await post<{ badges: BadgeEarned[] }>(`/api/placements/${feedback.placementId}/reason`, { reason });
      setReasonSaved(true);
      if (badges.length) setNewBadges(badges);
    } catch (err) {
      setReasonError(errorText(err));
    }
  }

  if (error) return <PageShell><ErrorState message={error.message} backHref="/home" backLabel="Back to your valley" /></PageShell>;
  if (!data) return <PageShell><Loading label="Walking to the garden..." /></PageShell>;

  const { session, me } = data;
  const status = round?.timer.status;
  const handCards = (round?.hand ?? []).map((c) => ({ cardId: c.cardId, code: c.code, placed: Boolean(c.placedSlotId) }));
  const handDone = handCards.length > 0 && handCards.every((c) => c.placed);

  // Shown in the seed pouch while the Round runs, and kept after it ends, so the last seed can still get a reason.
  const feedbackBox = feedback && (
    <div key={feedback.key} className="mb-3 bg-parchment p-2 text-ink" style={{ boxShadow: "0 0 0 3px #3b2a1e" }}>
      <p className="flex items-center gap-2 font-bold" role="status">
        <Sprite grid={feedback.kind === "bloom" ? BLOOM : WILT} scale={2} />
        {feedback.text}
      </p>
      {reasonSaved ? (
        <p className="mt-1 text-sm">Reason saved. Your lecturer can see it.</p>
      ) : (
        <form
          className="mt-1 flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void saveReason();
          }}
        >
          <label className="min-w-[200px] flex-1 text-sm">
            <span className="sr-only">Why did you choose plot {feedback.slotPosition}?</span>
            <input
              className="px-input !py-1 text-sm"
              placeholder={`Why plot ${feedback.slotPosition}? (optional)`}
              value={reason}
              maxLength={200}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <Button type="submit" tone="water" className="!px-3 !py-1 text-sm" disabled={!reason.trim()}>
            Save
          </Button>
          <button type="button" className="text-sm underline" onClick={() => setFeedback(null)}>
            Skip
          </button>
        </form>
      )}
      <ErrorNote>{reasonError}</ErrorNote>
    </div>
  );
  const roundOver = status === "ended" || status === "revealed";

  return (
    <PageShell>
      <div className="flex flex-col gap-3">
        <Panel className="flex flex-wrap items-center gap-x-6 gap-y-2 !py-2">
          <div className="min-w-0 basis-full sm:basis-auto sm:flex-1">
            <p className="font-pixel text-sm">
              {session.courseCode} · Round {Math.max(1, session.roundIndex + 1)} of {session.roundCount}
            </p>
            <p className="flex flex-wrap items-center gap-2 font-pixel text-2xl">
              {round?.exercise.title ?? "The gate is open"}
              {round && <LanguageTag language={round.exercise.language} />}
            </p>
          </div>
          {me.team && (
            <Tag color={me.team.color}>
              {me.team.name} · {me.team.score.toLocaleString()}
            </Tag>
          )}
          <div className="sm:text-right">
            <p className="flex items-center gap-1 font-pixel text-2xl sm:justify-end">
              <Sprite grid={STAR} scale={2} />
              {me.points.toLocaleString()}
            </p>
            <p className="text-xs">
              {me.rank ? `You're #${me.rank} of ${me.of} (only you see this)` : `${me.of} gardeners here`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSound(!sound)}
            className="px-btn px-btn-secondary ml-auto !px-2 !py-1 text-xs sm:ml-1"
            aria-pressed={sound}
          >
            Sound {sound ? "on" : "off"}
          </button>
        </Panel>

        {newBadges.length > 0 && (
          <Panel className="flex flex-wrap items-center gap-3 !bg-[#fff3c4]" role="status">
            {newBadges.map((b) => (
              <span key={b.id} className="flex items-center gap-2">
                <Sprite grid={BADGE_ICONS[b.icon] ?? STAR} scale={3} />
                <span>
                  <span className="font-pixel">New badge: {b.name}</span>
                  <span className="block text-xs">{b.description}</span>
                </span>
              </span>
            ))}
            <button type="button" className="ml-auto text-sm underline" onClick={() => setNewBadges([])}>
              Nice
            </button>
          </Panel>
        )}

        {session.status === "closed" ? (
          <ClosedView points={me.points} rank={me.rank} of={me.of} />
        ) : !me.joined ? (
          <JoiningView error={joinError} onRetry={() => setJoinError("")} />
        ) : !round ? (
          <LobbyView nickname={me.nickname} count={me.of} />
        ) : (
          <div className="flex flex-col gap-3">
            <SunTimer timer={round.timer} left={left} />
            {status === "paused" && (
              <Panel className="text-center font-pixel text-xl" role="status">
                Your lecturer paused the Round. Take a breath.
              </Panel>
            )}
            {roundOver && data.result && <ResultView result={data.result} revealed={round.revealed} />}
            {roundOver && (feedbackBox || placeError) && (
              <Panel className="!p-2">
                <ErrorNote>{placeError}</ErrorNote>
                {feedbackBox}
              </Panel>
            )}
            {roundOver && !data.result && (
              <Panel className="text-center font-pixel" role="status">
                You joined after this Round was dealt. Your seeds come with the next Round.
              </Panel>
            )}
            <Board
              plots={plots}
              armed={Boolean(selected) && status === "running"}
              flash={flash}
              onPlot={status === "running" ? (id) => void place(id) : undefined}
              onDropCard={status === "running" ? (id, card) => void place(id, card) : undefined}
            />
            {status === "running" || status === "paused" ? (
              <HandTray
                cards={handCards}
                selected={selected}
                onSelect={(id) => {
                  setSelected(id);
                  setPlaceError("");
                  if (sound && id) sfx.tap();
                }}
                disabled={status !== "running" || busy}
              >
                <ErrorNote>{placeError}</ErrorNote>
                {feedbackBox}
                {handDone && (
                  <p className="mb-2 flex items-center gap-2 font-pixel text-parchment">
                    <Sprite grid={BASKET} scale={2} /> Your pouch is empty. Harvest time! Watch the projector.
                  </p>
                )}
              </HandTray>
            ) : null}
          </div>
        )}
      </div>
    </PageShell>
  );
}

function JoiningView({ error, onRetry }: { error: string; onRetry: () => void }) {
  if (!error) return <Loading label="Opening the gate..." />;
  return (
    <Panel className="mx-auto w-full max-w-xl">
      <Heading>You&apos;re not in yet</Heading>
      <ErrorNote>{error}</ErrorNote>
      <div className="flex flex-wrap gap-1">
        <Button onClick={onRetry}>Try again</Button>
        <ButtonLink href="/home" tone="secondary">
          Back to your valley
        </ButtonLink>
      </div>
    </Panel>
  );
}

function LobbyView({ nickname, count }: { nickname: string; count: number }) {
  return (
    <Panel className="flex flex-col items-center gap-3 py-10 text-center">
      <span className="anim-bob">
        <Avatar scale={7} />
      </span>
      <p className="font-pixel text-3xl">You&apos;re in, {nickname}!</p>
      <p>
        {count} {count === 1 ? "gardener is" : "gardeners are"} at the gate. The first Round starts when your lecturer is ready.
      </p>
      <p className="text-sm">Tip: read the signposts first. Each one is a step of the algorithm in plain words.</p>
    </Panel>
  );
}

function ResultView({ result, revealed }: { result: NonNullable<StudentState["result"]>; revealed: boolean }) {
  const climb = result.previousRank ? result.previousRank - result.rank : 0;
  const sprite = result.harvested ? BASKET : SPROUT;
  // Phones stack the card, so its picture shrinks to sit beside the title; from sm up it is one row.
  return (
    <Panel className="flex flex-col gap-3 !bg-[#fff3c4] sm:flex-row sm:items-center sm:gap-4">
      <span className="hidden shrink-0 sm:block">
        <Sprite grid={sprite} scale={5} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 font-pixel text-2xl">
          <span className="shrink-0 sm:hidden">
            <Sprite grid={sprite} scale={3} />
          </span>
          {result.harvested ? "Harvest!" : "Dusk falls on the garden"}
        </p>
        <p>
          +{result.roundPoints.toLocaleString()} points this Round · you&apos;re #{result.rank}
          {climb > 0 && <strong> · you climbed {climb} {climb === 1 ? "place" : "places"}!</strong>}
        </p>
        <p className="text-sm">{revealed ? "The full solution is shown below." : "Your lecturer will reveal the solution soon."}</p>
        <p className="text-xs text-ink-soft">A Round ends when time runs out or as soon as every gardener has planted every seed.</p>
      </div>
      {result.badges.length > 0 && (
        <div className="flex shrink-0 flex-wrap gap-2">
          {result.badges.map((b) => (
            <span key={b.id} title={b.name}>
              <Sprite grid={BADGE_ICONS[b.icon] ?? STAR} scale={3} title={b.name} />
            </span>
          ))}
        </div>
      )}
    </Panel>
  );
}

function ClosedView({ points, rank, of }: { points: number; rank: number | null; of: number }) {
  return (
    <Panel className="flex flex-col items-center gap-3 py-10 text-center">
      <Sprite grid={BASKET} scale={7} />
      <p className="font-pixel text-3xl">The Session is over</p>
      <p>
        You finished with {points.toLocaleString()} points{rank ? `, #${rank} of ${of}` : ""}. Your points became XP.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <ButtonLink href="/home">Back to the valley</ButtonLink>
        <ButtonLink href="/profile" tone="secondary">
          See your almanac
        </ButtonLink>
      </div>
    </Panel>
  );
}
