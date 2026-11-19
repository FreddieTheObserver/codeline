"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Sprite } from "./pixel/Sprite";
import { BLOOM, WILT } from "./pixel/sprites";
import { Button, ErrorNote, Field, Heading, cx } from "./ui";

type Tone = "leaf" | "danger" | "sun" | "water";

export type ConfirmOptions = {
  title: string;
  body?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: Tone;
};

export type PromptOptions = {
  title: string;
  body?: ReactNode;
  label: string;
  hint?: string;
  initial?: string;
  maxLength?: number;
  confirmLabel: string;
};

type Request =
  | { kind: "confirm"; id: number; options: ConfirmOptions; resolve: (ok: boolean) => void }
  | { kind: "prompt"; id: number; options: PromptOptions; resolve: (value: string | null) => void };

type ToastTone = "ok" | "error";
type Toast = { id: number; text: string; tone: ToastTone };

type Feedback = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
  toast: (text: string, tone?: ToastTone) => void;
};

const FeedbackContext = createContext<Feedback | null>(null);

const FLASH_KEY = "codeline-flash";

// For actions that end in a full page load, such as signing in or out: the message waits for the next page.
export function flashToast(text: string) {
  try {
    window.sessionStorage.setItem(FLASH_KEY, text);
  } catch {}
}

function settle(request: Request) {
  if (request.kind === "confirm") request.resolve(false);
  else request.resolve(null);
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<Request | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const current = useRef<Request | null>(null);
  const seq = useRef(0);

  const open = useCallback((next: Request | null) => {
    // A new question replaces one left open, which counts as cancelled.
    if (current.current && current.current !== next) settle(current.current);
    current.current = next;
    setRequest(next);
  }, []);

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => open({ kind: "confirm", id: ++seq.current, options, resolve })),
    [open],
  );
  const prompt = useCallback(
    (options: PromptOptions) => new Promise<string | null>((resolve) => open({ kind: "prompt", id: ++seq.current, options, resolve })),
    [open],
  );
  const toast = useCallback((text: string, tone: ToastTone = "ok") => {
    const id = ++seq.current;
    setToasts((list) => [...list.slice(-2), { id, text, tone }]);
    window.setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 4500);
  }, []);

  useEffect(() => {
    let text: string | null = null;
    try {
      text = window.sessionStorage.getItem(FLASH_KEY);
      window.sessionStorage.removeItem(FLASH_KEY);
    } catch {}
    if (text) toast(text);
  }, [toast]);

  const finish = (r: Request, value: boolean | string | null) => {
    current.current = null;
    setRequest(null);
    if (r.kind === "confirm") r.resolve(value === true);
    else r.resolve(typeof value === "string" ? value : null);
  };

  const value = useMemo(() => ({ confirm, prompt, toast }), [confirm, prompt, toast]);

  return (
    <FeedbackContext value={value}>
      {children}
      {request?.kind === "confirm" && <ConfirmDialog key={request.id} options={request.options} onDone={(ok) => finish(request, ok)} />}
      {request?.kind === "prompt" && <PromptDialog key={request.id} options={request.options} onDone={(v) => finish(request, v)} />}
      {/* On phones the bottom edge belongs to sticky bars such as the seed pouch, so messages appear at the top there. */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 top-4 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:top-auto sm:right-6 sm:bottom-4 sm:items-end"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cx("anim-toast px-panel pointer-events-auto flex max-w-sm items-center gap-3 px-4 py-2 text-sm font-bold", t.tone === "error" && "!bg-[#fde4df]")}
          >
            <Sprite grid={t.tone === "ok" ? BLOOM : WILT} scale={2} />
            <span className="flex-1">{t.text}</span>
            <button
              type="button"
              className="px-1 text-ink-soft hover:text-ink"
              aria-label="Dismiss message"
              onClick={() => setToasts((list) => list.filter((x) => x.id !== t.id))}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </FeedbackContext>
  );
}

function useFeedback(): Feedback {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error("FeedbackProvider is missing from the root layout.");
  return ctx;
}

export const useConfirm = () => useFeedback().confirm;
export const usePrompt = () => useFeedback().prompt;
export const useToast = () => useFeedback().toast;

// A modal on the native <dialog>: the browser traps focus, makes the page inert and closes it on Escape.
export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const pressedOnBackdrop = useRef(false);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    const target = dialog.querySelector<HTMLElement>("[data-autofocus]");
    target?.focus();
    if (target instanceof HTMLInputElement) target.select();
    return () => {
      if (dialog.open) dialog.close();
      previous?.focus();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className="px-dialog"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onMouseDown={(e) => {
        pressedOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (pressedOnBackdrop.current && e.target === e.currentTarget) onClose();
      }}
    >
      <div className="px-panel p-5">
        <Heading>
          <span id={titleId}>{title}</span>
        </Heading>
        {children}
      </div>
    </dialog>
  );
}

function ConfirmDialog({ options, onDone }: { options: ConfirmOptions; onDone: (ok: boolean) => void }) {
  const tone = options.tone ?? "leaf";
  // Destructive questions start on Cancel, so a stray Enter never deletes anything.
  const safeFirst = tone === "danger";
  return (
    <Modal title={options.title} onClose={() => onDone(false)}>
      {options.body && <div className="mt-2 flex flex-col gap-2 text-sm">{options.body}</div>}
      <div className="mt-5 flex flex-wrap justify-end gap-1">
        <Button type="button" tone="secondary" onClick={() => onDone(false)} data-autofocus={safeFirst ? "" : undefined}>
          {options.cancelLabel ?? "Cancel"}
        </Button>
        <Button type="button" tone={tone} onClick={() => onDone(true)} data-autofocus={safeFirst ? undefined : ""}>
          {options.confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

function PromptDialog({ options, onDone }: { options: PromptOptions; onDone: (value: string | null) => void }) {
  const [value, setValue] = useState(options.initial ?? "");
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError(`${options.label} can't be empty.`);
      return;
    }
    onDone(trimmed);
  }

  return (
    <Modal title={options.title} onClose={() => onDone(null)}>
      {options.body && <div className="mt-2 text-sm">{options.body}</div>}
      <form onSubmit={submit} className="mt-3" noValidate>
        <Field label={options.label} hint={options.hint}>
          <input
            className="px-input"
            value={value}
            maxLength={options.maxLength}
            onChange={(e) => {
              setValue(e.target.value);
              setError("");
            }}
            aria-invalid={Boolean(error)}
            data-autofocus=""
          />
        </Field>
        <ErrorNote>{error}</ErrorNote>
        <div className="mt-5 flex flex-wrap justify-end gap-1">
          <Button type="button" tone="secondary" onClick={() => onDone(null)}>
            Cancel
          </Button>
          <Button type="submit">{options.confirmLabel}</Button>
        </div>
      </form>
    </Modal>
  );
}
