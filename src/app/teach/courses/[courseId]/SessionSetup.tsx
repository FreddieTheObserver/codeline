"use client";

import { useState } from "react";
import { Button, ErrorNote, Field, Heading, Panel } from "@/components/ui";
import { errorText, post } from "@/lib/client";
import type { CourseDetail } from "@/lib/api-types";

type RoundDraft = { exerciseId: string; minutes: number };

export function SessionSetup({ detail, onCreated }: { detail: CourseDetail; onCreated: (id: string) => void }) {
  const playable = detail.exercises.filter((e) => e.dealable > 0);
  const [mode, setMode] = useState<"solo" | "teams">("solo");
  const [teamCount, setTeamCount] = useState(4);
  const [handSize, setHandSize] = useState(1);
  const [rounds, setRounds] = useState<RoundDraft[]>(playable[0] ? [{ exerciseId: playable[0].id, minutes: 3 }] : []);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (detail.course.live) {
    return (
      <Panel>
        <Heading>A Session is already open</Heading>
        <p className="mt-1">Close it from its console before starting another one.</p>
      </Panel>
    );
  }
  if (playable.length === 0) {
    return (
      <Panel>
        <Heading>Prepare an Exercise first</Heading>
        <p className="mt-1">A Session plays one Exercise per Round.</p>
      </Panel>
    );
  }

  const maxHand = Math.max(...rounds.map((r) => playable.find((e) => e.id === r.exerciseId)?.dealable ?? 1), 1);
  const update = (i: number, patch: Partial<RoundDraft>) => setRounds(rounds.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const move = (i: number, by: number) => {
    const j = i + by;
    if (j < 0 || j >= rounds.length) return;
    const next = [...rounds];
    [next[i], next[j]] = [next[j], next[i]];
    setRounds(next);
  };

  async function create() {
    setBusy(true);
    setError("");
    try {
      const { id } = await post<{ id: string }>("/api/sessions", {
        courseId: detail.course.id,
        mode,
        handSize,
        teamCount,
        rounds: rounds.map((r) => ({ exerciseId: r.exerciseId, timeLimitS: Math.round(r.minutes * 60) })),
      });
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
        <Field label={`Seeds per student (Hand size): ${handSize}`} hint={handSize === 1 ? "One seed each, like the paper version." : "Each student plants several seeds, in any order."}>
          <input type="range" min={1} max={maxHand} value={Math.min(handSize, maxHand)} onChange={(e) => setHandSize(Number(e.target.value))} className="w-full accent-[#3f9b4f]" />
        </Field>
      </div>

      <h3 className="mt-5 font-pixel text-lg">Rounds</h3>
      <ol className="mt-2 flex flex-col gap-2">
        {rounds.map((r, i) => (
          <li key={i} className="flex flex-wrap items-end gap-2 bg-parchment-dark/50 p-2" style={{ boxShadow: "0 0 0 2px #c9b48a" }}>
            <span className="pb-3 font-pixel text-xl">{i + 1}</span>
            <label className="min-w-[200px] flex-1">
              <span className="text-xs font-bold">Exercise</span>
              <select className="px-input" value={r.exerciseId} onChange={(e) => update(i, { exerciseId: e.target.value })}>
                {playable.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title} ({e.dealable} seeds)
                  </option>
                ))}
              </select>
            </label>
            <label className="w-32">
              <span className="text-xs font-bold">Minutes</span>
              <input type="number" min={0.5} max={30} step={0.5} value={r.minutes} onChange={(e) => update(i, { minutes: Math.max(0.5, Math.min(30, Number(e.target.value) || 1)) })} className="px-input" />
            </label>
            <span className="flex gap-1 pb-1">
              <button type="button" className="px-btn px-btn-secondary !px-2 !py-1" onClick={() => move(i, -1)} aria-label={`Move Round ${i + 1} up`}>
                ↑
              </button>
              <button type="button" className="px-btn px-btn-secondary !px-2 !py-1" onClick={() => move(i, 1)} aria-label={`Move Round ${i + 1} down`}>
                ↓
              </button>
              <button type="button" className="px-btn px-btn-danger !px-2 !py-1" onClick={() => setRounds(rounds.filter((_, j) => j !== i))} aria-label={`Remove Round ${i + 1}`}>
                ✕
              </button>
            </span>
          </li>
        ))}
      </ol>
      {rounds.length < 8 && (
        <Button tone="secondary" className="mt-2" onClick={() => setRounds([...rounds, { exerciseId: playable[0].id, minutes: 3 }])}>
          Add a Round
        </Button>
      )}
      <ErrorNote>{error}</ErrorNote>
      <div className="mt-4">
        <Button tone="sun" disabled={busy || rounds.length === 0} onClick={create}>
          {busy ? "Opening the gate..." : "Open the Lobby"}
        </Button>
      </div>
    </Panel>
  );
}
