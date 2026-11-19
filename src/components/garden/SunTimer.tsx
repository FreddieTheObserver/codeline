import { Sprite } from "../pixel/Sprite";
import { SUN } from "../pixel/sprites";
import { formatClock } from "@/lib/clock";
import type { TimerDto } from "@/lib/api-types";

// The Round timer as the sun crossing the sky; the sky turns to dusk near the end.
export function SunTimer({ timer, left, big }: { timer: TimerDto | null; left: number | null; big?: boolean }) {
  const total = (timer?.timeLimitS ?? 1) * 1000;
  const fraction = left === null ? 0 : Math.min(1, Math.max(0, 1 - left / total));
  const dusk = left !== null && left <= total * 0.2 && timer?.status !== "pending";
  const status = timer?.status;
  return (
    <div
      className={`relative m-1 w-[calc(100%-8px)] overflow-hidden ${big ? "h-20" : "h-12"}`}
      style={{
        background: dusk ? "linear-gradient(#f2a65a, #f6c98a)" : "linear-gradient(#8fcbea, #bfe3f5)",
        boxShadow: "0 0 0 4px #3b2a1e",
        transition: "background 1s",
      }}
      role="timer"
      aria-label={`Time left ${formatClock(left)}`}
    >
      <div
        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-[left] duration-300"
        style={{ left: `calc(${6 + fraction * 88}%)` }}
      >
        <Sprite grid={SUN} scale={big ? 5 : 3} />
      </div>
      <div className={`absolute right-2 top-1/2 -translate-y-1/2 bg-parchment px-2 font-pixel ${big ? "text-4xl" : "text-2xl"}`} style={{ boxShadow: "0 0 0 3px #3b2a1e" }}>
        {status === "paused" ? "Paused" : status === "ended" || status === "revealed" ? "Dusk" : formatClock(left)}
      </div>
    </div>
  );
}
