import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Sprite } from "./pixel/Sprite";
import { SPROUT } from "./pixel/sprites";
import { languageLabel } from "@/domain/exercise-text";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export function Panel({ className, wood, ...rest }: ComponentProps<"section"> & { wood?: boolean }) {
  return <section className={cx("px-panel", wood && "px-panel-wood", "p-4", className)} {...rest} />;
}

type Tone = "leaf" | "secondary" | "danger" | "sun" | "water";
const toneClass: Record<Tone, string> = {
  leaf: "",
  secondary: "px-btn-secondary",
  danger: "px-btn-danger",
  sun: "px-btn-sun",
  water: "px-btn-water",
};

export function Button({ tone = "leaf", className, ...rest }: ComponentProps<"button"> & { tone?: Tone }) {
  return <button className={cx("px-btn", toneClass[tone], className)} {...rest} />;
}

export function ButtonLink({ tone = "leaf", className, ...rest }: ComponentProps<typeof Link> & { tone?: Tone }) {
  return <Link className={cx("px-btn inline-block text-center no-underline", toneClass[tone], className)} {...rest} />;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-soft">{hint}</span>}
    </label>
  );
}

export function Title({ children, className }: { children: ReactNode; className?: string }) {
  return <h1 className={cx("font-pixel text-3xl leading-tight", className)}>{children}</h1>;
}

export function Heading({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cx("font-pixel text-xl leading-tight", className)}>{children}</h2>;
}

export function Tag({ children, color = "#ecdcb6", className }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span
      className={cx("inline-block px-2 py-0.5 font-pixel text-xs leading-none", className)}
      style={{ background: color, boxShadow: "0 0 0 2px #3b2a1e" }}
    >
      {children}
    </span>
  );
}

export function LanguageTag({ language }: { language: string }) {
  const colors: Record<string, string> = { java: "#f2b46b", python: "#9fc7f0", c: "#cfd6dc", cpp: "#b9c4f2", javascript: "#f6e27a" };
  return <Tag color={colors[language] ?? "#ecdcb6"}>{languageLabel(language)}</Tag>;
}

export function SampleTag() {
  return <Tag color="#f6e0a8">Sample data</Tag>;
}

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="my-2 bg-[#fde4df] px-3 py-2 text-sm font-bold text-berry-dark" style={{ boxShadow: "0 0 0 3px #c8483f" }}>
      {children}
    </p>
  );
}

export function Loading({ label = "Loading the valley..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16" role="status">
      <span className="anim-bob">
        <Sprite grid={SPROUT} scale={5} />
      </span>
      <span className="font-pixel text-lg">{label}</span>
    </div>
  );
}

export function Meter({ value, max, color = "#3f9b4f", label }: { value: number; max: number; color?: string; label?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      className="h-4 w-full bg-parchment-dark"
      style={{ boxShadow: "0 0 0 3px #3b2a1e" }}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={label}
    >
      <div className="h-full transition-[width] duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function pct(rate: number | null | undefined): string {
  return rate === null || rate === undefined ? "-" : `${Math.round(rate * 100)}%`;
}
