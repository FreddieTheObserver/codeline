import { pct } from "@/components/ui";
import type { SlotStatDto } from "@/lib/api-types";

// One bar per step: the share of students right on the first try, and where they most often put the line instead.
export function StepBars({ steps }: { steps: SlotStatDto[] }) {
  return (
    <ul className="mt-3 flex flex-col gap-3">
      {steps.map((s) => {
        const rate = s.firstTryRate;
        const color = rate === null ? "#ecdcb6" : rate >= 0.7 ? "#3f9b4f" : rate >= 0.45 ? "#e9b949" : "#c8483f";
        return (
          <li key={s.slotId}>
            <div className="flex justify-between gap-2 text-sm">
              <span className="font-bold">
                {s.position + 1}. {s.pseudocode}
              </span>
              <span>{pct(rate)}</span>
            </div>
            <div className="mt-0.5 h-4 border-2 border-ink bg-parchment-dark">
              <div className="h-full" style={{ width: `${Math.round((rate ?? 0) * 100)}%`, background: color }} />
            </div>
            {s.commonWrong && s.commonWrong.share > 0 && (
              <p className="mt-0.5 text-xs text-ink-soft">
                {Math.round(s.commonWrong.share * 100)}% put it at step {s.commonWrong.position + 1} ({s.commonWrong.pseudocode}) instead
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
