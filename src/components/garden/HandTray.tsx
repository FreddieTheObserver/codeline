"use client";

import { Sprite } from "../pixel/Sprite";
import { SEED } from "../pixel/sprites";
import { cx } from "../ui";

export type HandCard = { cardId: string; code: string; placed: boolean };

export function HandTray({
  cards,
  selected,
  onSelect,
  disabled,
  children,
}: {
  cards: HandCard[];
  selected: string | null;
  onSelect: (cardId: string | null) => void;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  const left = cards.filter((c) => !c.placed);
  return (
    <div className="sticky bottom-0 z-20 mt-4">
      <div className="px-panel px-panel-wood !mx-1 !mb-1 p-3">
        {children}
        <div className="mb-2 flex items-center justify-between gap-2 font-pixel">
          <span>Seed pouch</span>
          <span className="text-sm">
            {left.length === 0 ? "All planted!" : `${left.length} of ${cards.length} left · tap a seed, then a plot`}
          </span>
        </div>
        <ul className="flex flex-wrap gap-2" aria-label="Your seeds">
          {cards.map((c) => (
            <li key={c.cardId}>
              <button
                type="button"
                disabled={disabled || c.placed}
                aria-pressed={selected === c.cardId}
                draggable={!disabled && !c.placed}
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/codeline-card", c.cardId);
                  onSelect(c.cardId);
                }}
                onClick={() => onSelect(selected === c.cardId ? null : c.cardId)}
                className={cx(
                  "flex max-w-full items-center gap-2 bg-parchment px-2 py-1.5 text-left font-mono text-[13px] text-ink sm:text-sm",
                  c.placed ? "opacity-40 line-through" : "cursor-pointer hover:-translate-y-0.5",
                  selected === c.cardId && "-translate-y-1 !bg-[#fff3c4]",
                )}
                style={{ boxShadow: selected === c.cardId ? "0 0 0 4px #f6c445, 0 0 0 7px #3b2a1e" : "0 0 0 3px #3b2a1e" }}
              >
                <Sprite grid={SEED} scale={2} />
                <span className="whitespace-pre-wrap break-all">{c.code}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
