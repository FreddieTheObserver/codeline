"use client";

import { Sprite } from "../pixel/Sprite";
import { BLOOM, SPROUT, WILT } from "../pixel/sprites";
import { cx } from "../ui";

export type PlotState = "given" | "empty" | "mine" | "revealed" | "class";

export type PlotView = {
  id: string;
  position: number;
  pseudocode: string;
  indent: number;
  code: string | null;
  state: PlotState;
  // Class Board only: share of holders right on the first try.
  rate?: number | null;
  placedCorrect?: number;
};

type Props = {
  plots: PlotView[];
  armed?: boolean;
  flash?: { slotId: string; kind: "bloom" | "wilt"; key: number } | null;
  onPlot?: (slotId: string) => void;
  onDropCard?: (slotId: string, cardId: string) => void;
  big?: boolean;
};

function stageFor(plot: PlotView) {
  if (plot.state !== "class") return null;
  if (!plot.placedCorrect) return null;
  return (plot.rate ?? 0) >= 0.6 ? BLOOM : SPROUT;
}

export function Board({ plots, armed, flash, onPlot, onDropCard, big }: Props) {
  return (
    <ol className="flex flex-col gap-2" aria-label="Garden rows">
      {plots.map((p) => {
        const flashing = flash?.slotId === p.id ? flash : null;
        const clickable = Boolean(onPlot) && p.state === "empty";
        const classStage = stageFor(p);
        return (
          <li key={p.id} className="grid gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
            <div className={cx("m-[3px] flex items-start gap-2 bg-wood px-3 py-2 text-parchment", big ? "text-xl" : "text-sm")} style={{ boxShadow: "0 0 0 3px #5e3b26" }}>
              <span className="font-pixel opacity-80">{p.position + 1}</span>
              <span className="font-bold" style={{ paddingLeft: `${p.indent * 0.75}rem` }}>
                {p.pseudocode || <span className="italic opacity-70">(structure)</span>}
              </span>
            </div>
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onPlot?.(p.id)}
              onDragOver={(e) => {
                if (clickable && onDropCard) e.preventDefault();
              }}
              onDrop={(e) => {
                const cardId = e.dataTransfer.getData("text/codeline-card");
                if (clickable && cardId) onDropCard?.(p.id, cardId);
              }}
              aria-label={
                p.state === "empty"
                  ? `Plot ${p.position + 1}, empty${armed ? ", plant your selected seed here" : ""}`
                  : `Plot ${p.position + 1}: ${p.code ?? "growing"}`
              }
              className={cx(
                "plot relative flex min-h-11 items-center gap-2 px-3 py-1.5 text-left font-mono",
                big ? "text-lg" : "text-[13px] sm:text-sm",
                p.state === "given" && "!bg-[#b98e6c] text-parchment/90",
                (p.state === "mine" || p.state === "revealed") && "text-parchment",
                p.state === "revealed" && "!bg-[#7d6a2f]",
                clickable && armed && "cursor-pointer outline-dashed outline-3 outline-offset-2 outline-sun hover:brightness-110",
                clickable && !armed && "cursor-default",
                flashing?.kind === "wilt" && "anim-wilt",
              )}
            >
              <span style={{ paddingLeft: `${p.indent * 1.1}rem` }} className="flex-1 whitespace-pre-wrap break-words">
                {p.code ?? (p.state === "class" ? "" : <span className="font-sans text-xs italic text-parchment/60">empty plot</span>)}
              </span>
              {p.state === "mine" && (
                <span key={flashing?.key} className={flashing?.kind === "bloom" ? "anim-sprout" : undefined}>
                  <Sprite grid={BLOOM} scale={big ? 3 : 2} title="Planted" />
                </span>
              )}
              {flashing?.kind === "wilt" && (
                <span key={flashing.key} className="anim-sprout">
                  <Sprite grid={WILT} scale={2} title="Wilted" />
                </span>
              )}
              {classStage && (
                <span className="flex items-center gap-2">
                  <span className="font-sans text-xs text-parchment">{Math.round((p.rate ?? 0) * 100)}% first try</span>
                  <Sprite grid={classStage} scale={big ? 3 : 2} />
                </span>
              )}
              {p.state === "given" && <span className="font-sans text-[10px] uppercase tracking-wide text-parchment/80">given</span>}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
