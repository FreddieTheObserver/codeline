export type SortValue = string | number | null | undefined;

const missing = (v: SortValue): v is null | undefined => v === null || v === undefined;

// Missing values sort last in both directions, so a student with no results yet never tops a table.
export function sortBy<T>(items: readonly T[], value: (item: T) => SortValue, dir: 1 | -1, tieBreak?: (a: T, b: T) => number): T[] {
  return [...items].sort((a, b) => {
    const x = value(a);
    const y = value(b);
    if (missing(x) || missing(y)) {
      if (missing(x) && missing(y)) return tieBreak?.(a, b) ?? 0;
      return missing(x) ? 1 : -1;
    }
    const order = typeof x === "string" && typeof y === "string" ? x.localeCompare(y) : x < y ? -1 : x > y ? 1 : 0;
    return order * dir || (tieBreak?.(a, b) ?? 0);
  });
}
