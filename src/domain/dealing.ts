import { seededRng, shuffled } from "./random";

export function effectiveHandSize(requested: number, dealableCount: number): number {
  return Math.max(1, Math.min(requested, dealableCount));
}

// Seat n takes a window of handSize consecutive Snippets from one shuffled cycle,
// so each Hand holds distinct Snippets and every Snippet is held by about the
// same number of students. Late joiners take the next seat and keep the balance.
export function dealHand(
  dealableIds: readonly string[],
  handSize: number,
  seat: number,
  seed: number,
): string[] {
  if (dealableIds.length === 0) return [];
  const order = shuffled([...dealableIds].sort(), seededRng(seed));
  const size = effectiveHandSize(handSize, order.length);
  const start = (seat * size) % order.length;
  return Array.from({ length: size }, (_, k) => order[(start + k) % order.length]);
}
