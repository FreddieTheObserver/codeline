"use client";

import { useRouter } from "next/navigation";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useConfirm, useToast } from "@/components/feedback";
import { Board, type PlotView } from "@/components/garden/Board";
import { HandTray } from "@/components/garden/HandTray";
import { PageShell } from "@/components/PageShell";
import { useLeaveGuard } from "@/components/useLeaveGuard";
import { Button, ErrorNote, Field, Heading, PageHeader, Panel, Tag, cx } from "@/components/ui";
import { del, errorText, post, put } from "@/lib/client";
import { LANGUAGES, splitCode } from "@/domain/exercise-text";
import { fitsSlot } from "@/domain/judge";
import { seededRng, shuffled } from "@/domain/random";
import type { ExerciseDto } from "@/lib/api-types";
import { courseHref } from "./courses/[courseId]/tabs";

type Row = { key: string; id?: string; pseudocode: string; code: string; indent: number; given: boolean; played?: boolean };

let keySeq = 0;
const newKey = () => `row-${++keySeq}`;

const ROW_GRID = "grid gap-2 md:grid-cols-[2rem_minmax(0,1fr)_minmax(0,1.3fr)_13rem] md:items-center";
const SMALL_BTN = "px-btn !m-0.5 !px-1.5 !py-0.5 text-xs";

export function ExerciseEditor({
  courseId,
  courseCode,
  initial,
  onSaved,
}: {
  courseId: string;
  courseCode: string;
  initial?: ExerciseDto;
  onSaved?: () => Promise<void>;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const canEdit = initial ? initial.canEdit : true;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [language, setLanguage] = useState(initial?.language ?? "java");
  const [rows, setRows] = useState<Row[]>(() => (initial?.rows ?? []).map((r) => ({ ...r, key: newKey() })));
  const [paste, setPaste] = useState("");
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  useLeaveGuard(canEdit && dirty, initial ? initial.title : "this new Exercise");

  // Next.js keeps the New Exercise page alive after it moves on to the saved Exercise.
  // Once that Exercise exists, the next visit must start from a blank form, not from it.
  const blankWhenHidden = useRef(false);
  useLayoutEffect(
    () => () => {
      if (!blankWhenHidden.current) return;
      blankWhenHidden.current = false;
      setTitle("");
      setDescription("");
      setLanguage("java");
      setRows([]);
      setPaste("");
      setError("");
      setDirty(false);
      setTesting(false);
    },
    [],
  );

  const edit = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    setDirty(true);
  };
  const editRows = edit(setRows);
  const update = (i: number, patch: Partial<Row>) => editRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const move = (i: number, by: number) => {
    const j = i + by;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    editRows(next);
  };

  async function applyPaste() {
    if (!paste.trim()) return;
    if (rows.some((r) => r.played)) {
      setError("This Exercise has been played, so its rows can't be replaced. Duplicate it first.");
      return;
    }
    if (rows.length) {
      const ok = await confirm({
        title: "Replace the current rows?",
        body: `The ${rows.length} rows below, with their signposts, are replaced by one row per line of the pasted code.`,
        confirmLabel: "Replace rows",
        tone: "danger",
      });
      if (!ok) return;
    }
    editRows(splitCode(paste).map((r) => ({ ...r, key: newKey() })));
    setPaste("");
  }

  async function save() {
    setBusy(true);
    setError("");
    const body = { title, description, language, rows: rows.map(({ id, pseudocode, code, indent, given }) => ({ id, pseudocode, code, indent, given })) };
    try {
      if (initial) {
        await put(`/api/exercises/${initial.id}`, body);
        setDirty(false);
        toast(`${title || "Exercise"} is saved.`);
        await onSaved?.();
      } else {
        const { id } = await post<{ id: string }>(`/api/courses/${courseId}/exercises`, body);
        setDirty(false);
        blankWhenHidden.current = true;
        toast(`${title || "Exercise"} is created. Test play it before class.`);
        router.replace(`/teach/exercises/${id}`);
      }
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!initial) return;
    const ok = await confirm({
      title: `Delete ${initial.title}?`,
      body: "The Exercise and its rows are removed from the course. This can't be undone.",
      confirmLabel: "Delete Exercise",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await del(`/api/exercises/${initial.id}`);
      setDirty(false);
      toast(`${initial.title} is deleted.`);
      router.push(courseHref(courseId));
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <PageShell>
      <PageHeader
        breadcrumbs={[
          { label: "My courses", href: "/teach" },
          { label: courseCode, href: courseHref(courseId) },
          { label: "Exercises", href: courseHref(courseId) },
          { label: initial ? initial.title : "New Exercise" },
        ]}
        title={initial ? (canEdit ? `Edit ${initial.title}` : initial.title) : "New Exercise"}
        description={
          !canEdit
            ? "Read-only: only the course lecturer can change this Exercise."
            : initial?.played
              ? "This Exercise has been played. You can fix wording and add rows; removing a played row needs a duplicate."
              : "Paste the solution, write a plain-words step for each line, then test play it as a student."
        }
      />

      <div className={testing ? "grid items-start gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]" : "grid gap-4"}>
        <div className="flex flex-col gap-3">
          <Panel>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
              <Field label="Title">
                <input className="px-input" value={title} onChange={(e) => edit(setTitle)(e.target.value)} disabled={!canEdit} placeholder="FindMax" />
              </Field>
              <Field label="Language">
                <select className="px-input" value={language} onChange={(e) => edit(setLanguage)(e.target.value)} disabled={!canEdit}>
                  {LANGUAGES.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="What the program does (optional)">
                  <input
                    className="px-input"
                    value={description}
                    onChange={(e) => edit(setDescription)(e.target.value)}
                    disabled={!canEdit}
                    placeholder="Find the largest score in an array."
                  />
                </Field>
              </div>
            </div>
          </Panel>

          {canEdit && (
            <Panel>
              <Heading>1. Paste the solution code</Heading>
              <p className="text-sm">CodeLine splits it into one row per line and keeps the indentation in the plot. Lines that are only braces start as Given.</p>
              <textarea
                className="px-input mt-2 h-36 font-mono text-sm"
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                aria-label="Solution code to split into rows"
                placeholder={"public class FindMax {\n    public static void main(String[] args) {\n        ..."}
              />
              <Button tone="water" onClick={applyPaste} disabled={!paste.trim()}>
                Split into rows
              </Button>
            </Panel>
          )}

          <Panel>
            <Heading>{canEdit ? "2. Write a signpost for each row" : "Rows"}</Heading>
            <p className="text-sm">The pseudocode step is what students read. Given rows are planted for everyone and never dealt.</p>
            {rows.length > 0 && (
              <div className={`${ROW_GRID} mt-3 hidden px-2 text-xs font-bold md:grid`} aria-hidden="true">
                <span>#</span>
                <span>Signpost (pseudocode)</span>
                <span>Code</span>
                <span>Options</span>
              </div>
            )}
            <ol className="mt-1 flex flex-col gap-2">
              {rows.length === 0 && <li className="px-row px-3 py-4 text-center text-sm">No rows yet. Paste the solution code above, or add rows one at a time.</li>}
              {rows.map((r, i) => (
                <li key={r.key} className={`${ROW_GRID} px-row p-2`}>
                  <span className="font-pixel md:text-center">{i + 1}</span>
                  <input
                    className="px-input text-sm"
                    value={r.pseudocode}
                    onChange={(e) => update(i, { pseudocode: e.target.value })}
                    placeholder={r.given ? "(optional for Given rows)" : "Plain-words step"}
                    aria-label={`Pseudocode step for row ${i + 1}`}
                    disabled={!canEdit}
                  />
                  <div className="flex items-center gap-1">
                    {canEdit && (
                      <span className="flex flex-col">
                        <button type="button" className="px-1 text-xs" onClick={() => update(i, { indent: Math.max(0, r.indent - 1) })} aria-label={`Outdent row ${i + 1}`}>
                          ◀
                        </button>
                        <button type="button" className="px-1 text-xs" onClick={() => update(i, { indent: Math.min(12, r.indent + 1) })} aria-label={`Indent row ${i + 1}`}>
                          ▶
                        </button>
                      </span>
                    )}
                    <input
                      className="px-input font-mono text-sm"
                      style={{ paddingLeft: `${10 + r.indent * 14}px` }}
                      value={r.code}
                      onChange={(e) => update(i, { code: e.target.value })}
                      aria-label={`Code for row ${i + 1}`}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <label className="mr-1 flex items-center gap-1 text-xs font-bold">
                      <input type="checkbox" checked={r.given} onChange={(e) => update(i, { given: e.target.checked })} disabled={!canEdit} /> Given
                    </label>
                    {canEdit && (
                      <>
                        <button type="button" className={cx(SMALL_BTN, "px-btn-secondary")} onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move row ${i + 1} up`}>
                          ↑
                        </button>
                        <button
                          type="button"
                          className={cx(SMALL_BTN, "px-btn-secondary")}
                          onClick={() => move(i, 1)}
                          disabled={i === rows.length - 1}
                          aria-label={`Move row ${i + 1} down`}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className={cx(SMALL_BTN, "px-btn-danger")}
                          onClick={() => editRows(rows.filter((_, j) => j !== i))}
                          disabled={r.played}
                          title={r.played ? "Already played; duplicate the Exercise to remove it" : undefined}
                          aria-label={`Remove row ${i + 1}`}
                        >
                          ✕
                        </button>
                      </>
                    )}
                    {r.played && (
                      <Tag color="#a4d77e" className="ml-1">
                        played
                      </Tag>
                    )}
                  </div>
                </li>
              ))}
            </ol>
            {canEdit && (
              <Button tone="secondary" className="mt-2" onClick={() => editRows([...rows, { key: newKey(), pseudocode: "", code: "", indent: 0, given: false }])}>
                Add a row
              </Button>
            )}
          </Panel>

          {canEdit && (
            <div className="sticky bottom-0 z-20">
              <Panel className="flex flex-wrap items-center gap-x-3 gap-y-1 !py-2">
                <Button onClick={save} disabled={busy || (Boolean(initial) && !dirty)}>
                  {busy ? "Saving..." : initial ? "Save changes" : "Create Exercise"}
                </Button>
                <span className="text-sm text-ink-soft" role="status">
                  {!initial ? "Not created yet." : dirty ? "You have unsaved changes." : "All changes saved."}
                </span>
                {initial && !initial.played && (
                  <Button tone="danger" onClick={remove} className="ml-auto">
                    Delete
                  </Button>
                )}
                {error && (
                  <div className="w-full">
                    <ErrorNote>{error}</ErrorNote>
                  </div>
                )}
              </Panel>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <Panel className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <Heading>Test play</Heading>
              <p className="text-sm">Try it as a student, with every seed in your pouch. Nothing is saved.</p>
            </div>
            <Button tone="sun" onClick={() => setTesting((t) => !t)} disabled={!rows.some((r) => !r.given && r.code.trim())}>
              {testing ? "Stop test" : "Start test play"}
            </Button>
          </Panel>
          {testing && <TestPlay rows={rows} />}
        </div>
      </div>
    </PageShell>
  );
}

function TestPlay({ rows }: { rows: Row[] }) {
  const slots = useMemo(() => rows.map((r, i) => ({ id: r.key, code: r.code, given: r.given, position: i, pseudocode: r.pseudocode, indent: r.indent })), [rows]);
  const [seed] = useState(() => Math.floor(Math.random() * 1e9));
  const deck = useMemo(() => shuffled(slots.filter((s) => !s.given && s.code.trim()), seededRng(seed)), [slots, seed]);
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ slotId: string; kind: "bloom" | "wilt"; key: number } | null>(null);
  const [wrong, setWrong] = useState(0);

  const occupied = new Set(Object.values(placed));
  const plots: PlotView[] = slots.map((s) => ({
    id: s.id,
    position: s.position,
    pseudocode: s.pseudocode,
    indent: s.indent,
    code: s.given ? s.code : occupied.has(s.id) ? s.code : null,
    state: s.given ? "given" : occupied.has(s.id) ? "mine" : "empty",
  }));

  function plant(slotId: string, cardId = selected) {
    if (!cardId) return;
    const card = deck.find((d) => d.id === cardId);
    const slot = slots.find((s) => s.id === slotId);
    if (!card || !slot) return;
    const ok = fitsSlot(card, slot);
    setFlash({ slotId, kind: ok ? "bloom" : "wilt", key: Date.now() });
    if (ok) {
      setPlaced({ ...placed, [card.id]: slotId });
      setSelected(null);
    } else {
      setWrong((w) => w + 1);
    }
  }

  return (
    <Panel className="!p-3">
      <p className="mb-2 text-sm font-bold">
        {Object.keys(placed).length} of {deck.length} planted · {wrong} wrong tries
      </p>
      <Board plots={plots} armed={Boolean(selected)} flash={flash} onPlot={(id) => plant(id)} onDropCard={(id, card) => plant(id, card)} />
      <HandTray cards={deck.map((d) => ({ cardId: d.id, code: d.code, placed: Boolean(placed[d.id]) }))} selected={selected} onSelect={setSelected} />
    </Panel>
  );
}
