"use client";

import { useEffect, useRef, useState } from "react";
import type { TimerDto } from "./api-types";

// Device clocks drift; every state response carries the server's time, so
// countdowns run against the server's clock instead of the device's.
export function serverOffset(serverNow: string | undefined, receivedAt: number): number {
  return serverNow ? new Date(serverNow).getTime() - receivedAt : 0;
}

export function remainingMs(timer: TimerDto | null | undefined, offset: number, now = Date.now()): number | null {
  if (!timer) return null;
  if (timer.status === "paused") return timer.pausedRemainingMs ?? 0;
  if (timer.status === "pending") return timer.timeLimitS * 1000;
  if (timer.status !== "running" || !timer.deadlineAt) return 0;
  return Math.max(0, new Date(timer.deadlineAt).getTime() - (now + offset));
}

export function useCountdown(timer: TimerDto | null | undefined, offset: number, onZero?: () => void): number | null {
  const [left, setLeft] = useState<number | null>(null);
  const zero = useRef(onZero);
  useEffect(() => {
    zero.current = onZero;
  }, [onZero]);
  useEffect(() => {
    let fired = false;
    const tick = () => {
      const ms = remainingMs(timer, offset);
      setLeft(ms);
      if (ms === 0 && timer?.status === "running" && !fired) {
        fired = true;
        zero.current?.();
      }
    };
    const id = window.setInterval(tick, 250);
    const first = window.setTimeout(tick, 0);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(first);
    };
  }, [timer, offset]);
  return left;
}

export function formatClock(ms: number | null): string {
  if (ms === null) return "--:--";
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
