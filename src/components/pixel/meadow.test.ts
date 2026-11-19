import { describe, expect, it } from "vitest";
import { drawMeadow, MEADOW_PALETTE, MEADOW_SIZE, MeadowCanvas, meadowSvg } from "./meadow";

const INK = "#3b2a1e";
const GRASS = "#7cbf5a";

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("meadow", () => {
  it("keeps ink text readable on every colour it uses", () => {
    for (const color of Object.values(MEADOW_PALETTE)) expect(contrast(INK, color), color).toBeGreaterThanOrEqual(4.5);
  });

  it("draws the same tile every time", () => {
    expect(meadowSvg()).toBe(meadowSvg());
  });

  it("leaves the base grass transparent so the page colour shows through", () => {
    expect(drawMeadow().pixels).not.toContain(GRASS);
    expect(meadowSvg().toLowerCase()).not.toContain(GRASS);
  });

  it("continues a motif across the tile edge so tiles join without a seam", () => {
    const canvas = new MeadowCanvas(MEADOW_SIZE);
    const last = MEADOW_SIZE - 1;
    canvas.stamp(last, last, ["dl", "ld"]);
    expect(canvas.get(last, last)).toBe(MEADOW_PALETTE.d);
    expect(canvas.get(0, last)).toBe(MEADOW_PALETTE.l);
    expect(canvas.get(last, 0)).toBe(MEADOW_PALETTE.l);
    expect(canvas.get(0, 0)).toBe(MEADOW_PALETTE.d);
    expect(canvas.isFree(1, 1, ["."], 1)).toBe(false);
  });
});
