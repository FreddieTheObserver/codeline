export type RowLike = { id: string; code: string; given: boolean };

export function normalizeCode(code: string): string {
  return code.trim().replace(/\s+/g, " ");
}

// Identical Snippets (two lone "}" lines, say) are interchangeable, so a Snippet
// fits any non-Given Slot whose own code reads the same.
export function fitsSlot(snippet: RowLike, slot: RowLike): boolean {
  if (slot.given) return false;
  return normalizeCode(snippet.code) === normalizeCode(slot.code);
}
