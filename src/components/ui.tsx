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

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-1 text-sm">
      <ol className="flex flex-wrap items-center gap-x-1.5">
        {items.map((c, i) => (
          <li key={`${c.label}-${i}`} className="flex items-center gap-x-1.5">
            {i > 0 && <span aria-hidden="true" className="text-ink-soft">/</span>}
            {c.href ? (
              <Link href={c.href} className="underline underline-offset-2 hover:text-leaf-dark">
                {c.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-bold">
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// The title row every signed-in page starts with: breadcrumbs, title and description on the left, page actions on the right.
export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  tags,
}: {
  title: ReactNode;
  description?: ReactNode;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
  tags?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div className="min-w-0">
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
        {tags && <div className="mb-1 flex flex-wrap items-center gap-2">{tags}</div>}
        <Title>{title}</Title>
        {description && <p className="mt-1 max-w-3xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-1">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Panel className="text-center">
      <p className="font-pixel text-3xl">{value}</p>
      <p className="text-sm">{label}</p>
    </Panel>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
      <Sprite grid={SPROUT} scale={4} />
      <p className="font-pixel text-lg">{title}</p>
      {children && <p className="max-w-md text-sm">{children}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, backHref, backLabel }: { message: string; backHref: string; backLabel: string }) {
  return (
    <Panel className="mx-auto max-w-xl">
      <Heading>Something went wrong</Heading>
      <ErrorNote>{message}</ErrorNote>
      <ButtonLink href={backHref} tone="secondary">
        {backLabel}
      </ButtonLink>
    </Panel>
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
      className="h-5 w-full border-[3px] border-ink bg-parchment-dark"
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
