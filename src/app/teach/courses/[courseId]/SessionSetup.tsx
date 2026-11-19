"use client";

import { useState } from "react";
import { useConfirm, useToast } from "@/components/feedback";
import { Button, ButtonLink, EmptyState, ErrorNote, Field, Heading, Panel } from "@/components/ui";
import { errorText, post } from "@/lib/client";
import type { CourseDetail } from "@/lib/api-types";

type RoundDraft = { key: number; exerciseId: string; minutes: number };

let roundKey = 0;
const draft = (exerciseId: string): RoundDraft => ({ key: ++roundKey, exerciseId, minutes: 3 });

// On one phone-width line the buttons squeeze the Exercise select down to its arrow.
const ROW = "grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-2 sm:grid-cols-[2rem_minmax(0,1fr)_6.5rem_auto]";

export function SessionSetup({ detail, onCreated }: { detail: CourseDetail; onCreated: (id: string) => void }) {
  const confirm = useConfirm();
  const toast = useToast();
  const playable = detail.exercises.filter((e) => e.dealable > 0);
  const [mode, setMode] = useState<"solo" | "teams">("solo");
  const [teamCount, setTeamCount] = useState(4);
  const [handSize, setHandSize] = useState(1);
  const [rounds, setRounds] = useState<RoundDraft[]>(playable[0] ? [draft(playable[0].id)] : []);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (detail.course.live) {
    return (
      <Panel>
        <EmptyState
          title="A Session is already open"
          action={
            <ButtonLink href={`/console/${detail.course.live.sessionId}`} tone="sun">
              Open its console
            </ButtonLink>
          }
        >
          Close it from its console before starting another one.
        </EmptyState>
      </Panel>
    );
  }
  if (playable.length === 0) {
    return (
      <Panel>
        <EmptyState
          title="Prepare an Exercise first"
          action={detail.course.canEdit ? <ButtonLink href={`/teach/courses/${detail.course.id}/exercises/new`}>New Exercise</ButtonLink> : undefined}
        >
          A Session plays one Exercise per Round, and an Exercise needs at least one step that isn&apos;t Given.
        </EmptyState>
      </Panel>
    );
  }

  const titleOf = (id: string) => playable.find((e) => e.id === id)?.title ?? "Exercise";
  const maxHand = Math.max(...rounds.map((r) => playable.find((e) => e.id === r.exerciseId)?.dealable ?? 1), 1);
  const hand = Math.min(handSize, maxHand);
  const update = (i: number, patch: Partial<RoundDraft>) => setRounds(rounds.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const move = (i: number, by: number) => {
    const j = i + by;
    if (j < 0 || j >= rounds.length) return;
    const next = [...rounds];
    [next[i], next[j]] = [next[j], next[i]];
    setRounds(next);
  };

  async function create() {
    const ok = await confirm({
      title: `Open the Lobby for ${detail.course.code}?`,
      body: (
        <>
          <p>Students enrolled in {detail.course.code} will see this Session as &ldquo;Live now&rdquo; and can join straight away.</p>
          <ul className="px-row flex flex-col gap-1 px-3 py-2">
            <li>
              <strong>Mode:</strong> {mode === "solo" ? "Solo" : `Teams, ${teamCount} farms`} · <strong>Hand:</strong> {hand} {hand === 1 ? "seed" : "seeds"} each
            </li>
            {rounds.map((r, i) => (
              <li key={r.key}>
                <strong>Round {i + 1}:</strong> {titleOf(r.exerciseId)}, {r.minutes} min
              </li>
            ))}
          </ul>
          <p>You start each Round from the console.</p>
        </>
      ),
      confirmLabel: "Open the Lobby",
      tone: "sun",
    });
    if (!ok) return;
    setBusy(true);
    setError("");
    try {
      const { id } = await post<{ id: string }>("/api/sessions", {
        courseId: detail.course.id,
        mode,
        handSize: hand,
        teamCount,
        rounds: rounds.map((r) => ({ exerciseId: r.exerciseId, timeLimitS: Math.round(r.minutes * 60) })),
      });
      toast("The Lobby is open. Put the projector view on screen so students can join.");
      onCreated(id);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <Panel>
      <Heading>Run a Session</Heading>
      <p className="text-sm">Set it up now; students join in the Lobby, and you start each Round from the console.</p>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <fieldset>
          <legend className="mb-1 text-sm font-bold">Play mode</legend>
          <div className="flex flex-wrap gap-1">
            {(["solo", "teams"] as const).map((m) => (
              <button key={m} type="button" className={`px-btn ${mode === m ? "px-btn-sun" : "px-btn-secondary"}`} aria-pressed={mode === m} onClick={() => setMode(m)}>
                {m === "solo" ? "Solo" : "Teams"}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs">
            {mode === "solo" ? "Everyone scores for themselves." : "CodeLine draws balanced farms at random; a farm scores its members' average."}
          </p>
        </fieldset>
        {mode === "teams" && (
          <Field label="Number of farms">
            <input type="number" min={2} max={6} value={teamCount} onChange={(e) => setTeamCount(Math.max(2, Math.min(6, Number(e.target.value) || 2)))} className="px-input" />
          </Field>
        )}
        <Field label={`Seeds per student (Hand size): ${hand}`} hint={hand === 1 ? "One seed each, like the paper version." : "Each student plants several seeds, in any order."}>
          <input type="range" min={1} max={maxHand} value={hand} onChange={(e) => setHandSize(Number(e.target.value))} className="w-full accent-[#3f9b4f]" />
        </Field>
      </div>

      <h3 className="mt-6 font-pixel text-lg">Rounds</h3>
      <div className={`${ROW} mt-2 hidden px-2 text-xs font-bold sm:grid`} aria-hidden="true">
        <span>#</span>
        <span>Exercise</span>
        <span>Minutes</span>
        <span className="sr-only">Order</span>
      </div>
      <ol className="mt-1 flex flex-col gap-2">
        {rounds.map((r, i) => (
          <li key={r.key} className={`${ROW} px-row px-2 py-1`}>
            <span className="row-span-2 text-center font-pixel text-xl sm:row-span-1">{i + 1}</span>
            <select className="px-input col-span-2 sm:col-span-1" value={r.exerciseId} onChange={(e) => update(i, { exerciseId: e.target.value })} aria-label={`Exercise for Round ${i + 1}`}>
              {playable.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title} ({e.dealable} seeds)
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2">
              <span className="text-xs font-bold sm:sr-only">Minutes</span>
              <input
                type="number"
                min={0.5}
                max={30}
                step={0.5}
                value={r.minutes}
                onChange={(e) => update(i, { minutes: Math.max(0.5, Math.min(30, Number(e.target.value) || 1)) })}
                className="px-input min-w-0 flex-1"
                aria-label={`Minutes for Round ${i + 1}`}
              />
            </label>
            <span className="flex gap-1">
              <button type="button" className="px-btn px-btn-secondary !px-2 !py-1" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move Round ${i + 1} up`}>
                ↑
              </button>
              <button
                type="button"
                className="px-btn px-btn-secondary !px-2 !py-1"
                onClick={() => move(i, 1)}
                disabled={i === rounds.length - 1}
                aria-label={`Move Round ${i + 1} down`}
              >
                ↓
              </button>
              <button
                type="button"
                className="px-btn px-btn-danger !px-2 !py-1"
                onClick={() => setRounds(rounds.filter((_, j) => j !== i))}
                disabled={rounds.length === 1}
                aria-label={`Remove Round ${i + 1}`}
                title={rounds.length === 1 ? "A Session needs at least one Round" : undefined}
              >
                ✕
              </button>
            </span>
          </li>
        ))}
      </ol>
      {rounds.length < 8 && (
        <Button tone="secondary" className="mt-2" onClick={() => setRounds([...rounds, draft(playable[0].id)])}>
          Add a Round
        </Button>
      )}
      <ErrorNote>{error}</ErrorNote>
      <div className="mt-4 flex flex-wrap items-center gap-3 border-t-2 border-parchment-dark pt-3">
        <Button tone="sun" disabled={busy || rounds.length === 0} onClick={create}>
          {busy ? "Opening the gate..." : "Open the Lobby"}
        </Button>
        <span className="text-sm text-ink-soft">
          {rounds.length} {rounds.length === 1 ? "Round" : "Rounds"} · {rounds.reduce((t, r) => t + r.minutes, 0)} min in total
        </span>
      </div>
    </Panel>
  );
}
