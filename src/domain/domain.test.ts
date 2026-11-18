import { describe, expect, it } from "vitest";
import { scoreCorrect, retryMultiplier, streakMultiplier } from "./scoring";
import { fitsSlot } from "./judge";
import { dealHand, effectiveHandSize } from "./dealing";
import { pickTeam, teamScore } from "./teams";
import { seededRng } from "./random";
import { levelForXp, xpForLevel } from "./levels";
import { slotStats, studentStats } from "./aggregate";
import { splitCode } from "./exercise-text";

describe("scoring", () => {
  it("gives full base points on a first try with no time left and no streak", () => {
    expect(scoreCorrect({ attempt: 1, timeLeft: 0, streakBefore: 0 })).toEqual({ points: 1000, streakAfter: 1 });
  });

  it("halves per retry down to a floor of 0.1", () => {
    expect([1, 2, 3, 4, 9].map(retryMultiplier)).toEqual([1, 0.5, 0.25, 0.1, 0.1]);
  });

  it("adds up to 30% for speed", () => {
    expect(scoreCorrect({ attempt: 1, timeLeft: 1, streakBefore: 0 }).points).toBe(1300);
    expect(scoreCorrect({ attempt: 1, timeLeft: 0.5, streakBefore: 0 }).points).toBe(1150);
  });

  it("grows the streak multiplier by 0.1 per first try in a row, capped at 1.5", () => {
    expect([1, 2, 3, 6, 20].map(streakMultiplier)).toEqual([1, 1.1, 1.2, 1.5, 1.5]);
    expect(scoreCorrect({ attempt: 1, timeLeft: 0, streakBefore: 1 })).toEqual({ points: 1100, streakAfter: 2 });
  });

  it("resets the streak and drops the streak bonus after a retry", () => {
    expect(scoreCorrect({ attempt: 2, timeLeft: 0, streakBefore: 4 })).toEqual({ points: 500, streakAfter: 0 });
  });
});

describe("judging", () => {
  const close1 = { id: "a", code: "}", given: false };
  const close2 = { id: "b", code: " } ", given: false };
  const givenClose = { id: "c", code: "}", given: true };
  const other = { id: "d", code: "max = x;", given: false };

  it("treats identical Snippets as interchangeable", () => {
    expect(fitsSlot(close1, close2)).toBe(true);
    expect(fitsSlot(close2, close1)).toBe(true);
  });

  it("never fits a Given Slot or a different line", () => {
    expect(fitsSlot(close1, givenClose)).toBe(false);
    expect(fitsSlot(close1, other)).toBe(false);
  });
});

describe("dealing", () => {
  const ids = ["r1", "r2", "r3", "r4", "r5"];

  it("caps the Hand at the number of dealable Snippets", () => {
    expect(effectiveHandSize(9, 5)).toBe(5);
    expect(effectiveHandSize(0, 5)).toBe(1);
  });

  it("deals distinct Snippets within one Hand", () => {
    for (let seat = 0; seat < 12; seat++) {
      const hand = dealHand(ids, 3, seat, 42);
      expect(new Set(hand).size).toBe(3);
    }
  });

  it("spreads Snippets evenly across seats", () => {
    const counts = new Map<string, number>();
    for (let seat = 0; seat < 10; seat++) {
      for (const id of dealHand(ids, 2, seat, 7)) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    expect([...counts.values()].every((c) => c === 4)).toBe(true);
  });

  it("leaves some Snippets undealt when there are fewer students than Snippets", () => {
    const dealt = new Set([0, 1].flatMap((seat) => dealHand(ids, 1, seat, 3)));
    expect(dealt.size).toBe(2);
  });

  it("is deterministic for a seed", () => {
    expect(dealHand(ids, 2, 3, 99)).toEqual(dealHand(ids, 2, 3, 99));
  });
});

describe("teams", () => {
  it("joins the smallest Team", () => {
    expect(pickTeam([3, 2, 3, 3], seededRng(1))).toBe(1);
  });

  it("stays balanced over many joins", () => {
    const counts = [0, 0, 0, 0];
    const rng = seededRng(5);
    for (let i = 0; i < 22; i++) counts[pickTeam(counts, rng)]++;
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });

  it("scores a Team by its members' average", () => {
    expect(teamScore([1000, 2000, 3000])).toBe(2000);
    expect(teamScore([])).toBe(0);
  });
});

describe("levels", () => {
  it("uses triangular thresholds", () => {
    expect([1, 2, 3, 4].map(xpForLevel)).toEqual([0, 1000, 3000, 6000]);
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(2999)).toBe(2);
    expect(levelForXp(3000)).toBe(3);
  });
});

describe("aggregates", () => {
  const rows = [
    { id: "s1", position: 0, pseudocode: "Set max", code: "int max = a[0];", given: false },
    { id: "s2", position: 1, pseudocode: "For each", code: "for (int x : a) {", given: false },
    { id: "s3", position: 2, pseudocode: "Update max", code: "max = x;", given: false },
    { id: "g", position: 3, pseudocode: "End for", code: "}", given: true },
  ];
  const hands = [
    { userId: "u1", rowId: "s3", placedSlotId: "s3" },
    { userId: "u2", rowId: "s3", placedSlotId: "s3" },
    { userId: "u3", rowId: "s3", placedSlotId: null },
    { userId: "u4", rowId: "s3", placedSlotId: "s3" },
  ];
  const placements = [
    { userId: "u1", rowId: "s3", slotId: "s3", correct: true, attempt: 1 },
    { userId: "u2", rowId: "s3", slotId: "s1", correct: false, attempt: 1 },
    { userId: "u2", rowId: "s3", slotId: "s3", correct: true, attempt: 2 },
    { userId: "u3", rowId: "s3", slotId: "s1", correct: false, attempt: 1 },
    { userId: "u4", rowId: "s3", slotId: "s2", correct: false, attempt: 1 },
    { userId: "u4", rowId: "s3", slotId: "s3", correct: true, attempt: 2 },
  ];

  it("computes first-try rate and the most common wrong Slot per step", () => {
    const stat = slotStats(rows, hands, placements).find((s) => s.slotId === "s3")!;
    expect(stat.heldBy).toBe(4);
    expect(stat.firstTryCorrect).toBe(1);
    expect(stat.firstTryRate).toBe(0.25);
    expect(stat.commonWrong).toMatchObject({ slotId: "s1", holders: 2, share: 0.5 });
  });

  it("skips Given Slots and reports null for steps nobody held", () => {
    const stats = slotStats(rows, hands, placements);
    expect(stats.map((s) => s.slotId)).toEqual(["s1", "s2", "s3"]);
    expect(stats[0].firstTryRate).toBeNull();
  });

  it("counts a student holding the same line in two Rounds as two holdings", () => {
    const twoRounds = [
      { roundId: "r1", userId: "u1", rowId: "s3", placedSlotId: "s3" },
      { roundId: "r2", userId: "u1", rowId: "s3", placedSlotId: "s3" },
    ];
    const plays = [
      { roundId: "r1", userId: "u1", rowId: "s3", slotId: "s3", correct: true, attempt: 1 },
      { roundId: "r2", userId: "u1", rowId: "s3", slotId: "s1", correct: false, attempt: 1 },
      { roundId: "r2", userId: "u1", rowId: "s3", slotId: "s3", correct: true, attempt: 2 },
    ];
    const stat = slotStats(rows, twoRounds, plays).find((s) => s.slotId === "s3")!;
    expect(stat.heldBy).toBe(2);
    expect(stat.firstTryRate).toBe(0.5);
    expect(stat.commonWrong).toMatchObject({ slotId: "s1", holders: 1, share: 0.5 });
  });

  it("summarises students", () => {
    const stats = studentStats(placements.map((p) => ({ ...p, roundId: "r1" })));
    expect(stats.get("u2")).toMatchObject({ placements: 1, firstTryRate: 0, avgRetries: 1 });
    expect(stats.get("u3")).toMatchObject({ placements: 0, firstTryRate: null });
  });
});

describe("splitting pasted code", () => {
  it("keeps indentation as a level and guesses structural lines as Given", () => {
    const rows = splitCode("public class A {\n    int x = 1;\n\n    }\n}");
    expect(rows).toEqual([
      { pseudocode: "", code: "public class A {", indent: 0, given: false },
      { pseudocode: "", code: "int x = 1;", indent: 1, given: false },
      { pseudocode: "", code: "}", indent: 1, given: true },
      { pseudocode: "", code: "}", indent: 0, given: true },
    ]);
  });
});
