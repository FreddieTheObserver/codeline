import { describe, expect, it } from "vitest";
import { sortBy } from "./sort";

type Row = { name: string; rate: number | null };
const rows: Row[] = [
  { name: "Bee", rate: 0.5 },
  { name: "ant", rate: null },
  { name: "Cat", rate: 0.2 },
  { name: "Dog", rate: 0.5 },
];
const names = (list: Row[]) => list.map((r) => r.name);

describe("sortBy", () => {
  it("sorts numbers up and down", () => {
    const withRate = rows.filter((r) => r.rate !== null);
    expect(names(sortBy(withRate, (r) => r.rate, 1))).toEqual(["Cat", "Bee", "Dog"]);
    expect(names(sortBy(withRate, (r) => r.rate, -1))).toEqual(["Bee", "Dog", "Cat"]);
  });

  it("puts missing values last in both directions", () => {
    expect(names(sortBy(rows, (r) => r.rate, 1)).at(-1)).toBe("ant");
    expect(names(sortBy(rows, (r) => r.rate, -1)).at(-1)).toBe("ant");
  });

  it("breaks ties with the tie-breaker, whatever the direction", () => {
    const byName = (a: Row, b: Row) => a.name.localeCompare(b.name);
    expect(names(sortBy(rows, (r) => r.rate, -1, byName))).toEqual(["Bee", "Dog", "Cat", "ant"]);
  });

  it("sorts text the way people read it, not by character code", () => {
    expect(names(sortBy(rows, (r) => r.name, 1))).toEqual(["ant", "Bee", "Cat", "Dog"]);
  });

  it("leaves the input untouched", () => {
    const before = names(rows);
    sortBy(rows, (r) => r.rate, 1);
    expect(names(rows)).toEqual(before);
  });
});
