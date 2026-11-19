"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

// Matches --motion-exit in globals.css.
export const EXIT_MS = 150;

// CSS animations obey the reduced-motion rule in globals.css by themselves; motion driven from script must ask.
function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function slowMotion() {
  const style = getComputedStyle(document.documentElement);
  return {
    duration: parseFloat(style.getPropertyValue("--motion-slow")) || 700,
    easing: style.getPropertyValue("--motion-ease-out").trim() || "ease-out",
  };
}

// Keeps something mounted while it plays its exit animation: `closing` is true for EXIT_MS after `open` turns false.
export function usePresence(open: boolean) {
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);
  useEffect(() => {
    if (open || !mounted) return;
    const timer = window.setTimeout(() => setMounted(false), EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open, mounted]);
  // Next.js keeps pages alive while hidden; dropping straight away means coming back never replays a stale exit.
  useLayoutEffect(() => () => setMounted(false), []);
  return { mounted: open || mounted, closing: !open && mounted };
}

// Slides reordered rows from their old place to their new one, and fades in rows that just arrived.
// Rows are the list's children with a data-flip key. The list must be position: relative, so offsetTop is
// measured from the list and nothing that moves above it counts as a reorder.
export function useFlip(list: RefObject<HTMLElement | null>, order: string) {
  const last = useRef<Map<string, number> | null>(null);
  useLayoutEffect(() => {
    if (!list.current) return;
    const rows = [...list.current.children].filter((c): c is HTMLElement => c instanceof HTMLElement && Boolean(c.dataset.flip));
    const now = new Map(rows.map((row) => [row.dataset.flip!, row.offsetTop]));
    const before = last.current;
    last.current = now;
    if (!before || reducedMotion()) return;
    const timing = slowMotion();
    for (const row of rows) {
      const from = before.get(row.dataset.flip!);
      const shift = from === undefined ? 0 : from - now.get(row.dataset.flip!)!;
      if (from === undefined) row.animate([{ opacity: 0 }, { opacity: 1 }], timing);
      else if (shift) row.animate([{ transform: `translateY(${shift}px)` }, { transform: "none" }], timing);
    }
  }, [list, order]);
}

// Counts to a new value instead of jumping to it.
export function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const current = useRef(value);
  useEffect(() => {
    const from = current.current;
    if (from === value) return;
    const length = reducedMotion() ? 0 : slowMotion().duration;
    const start = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const t = length ? Math.min(1, (now - start) / length) : 1;
      current.current = Math.round(from + (value - from) * (1 - (1 - t) ** 3));
      setShown(current.current);
      if (t < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <>{shown.toLocaleString()}</>;
}
