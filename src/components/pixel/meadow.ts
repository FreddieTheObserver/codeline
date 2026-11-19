// The page background: one seamless pixel-art meadow tile, drawn in code like the sprites and served at /meadow.svg.
// Pixels left in the base grass colour stay transparent, so the page's own background colour shows through.

export const MEADOW_SIZE = 192;
const SCALE = 4;
const SEED = 20261120;

// Page titles sit straight on the meadow, so every colour keeps ink text at 4.5:1 or better (see meadow.test.ts).
export const MEADOW_PALETTE: Record<string, string> = {
  "-": "#77ba56", // shaded patch
  "+": "#82c460", // sunlit patch
  d: "#67ad4a", // grass blade
  l: "#97d074", // sunlit blade
  t: "#b2df90", // blade tip
  s: "#6fb350", // shadow on the ground
  o: "#62a847", // bush edge
  b: "#6daf4f", // bush
  g: "#86c763", // bush leaves
  G: "#a4d87f", // bush highlight
  r: "#e5765f", // berries and mushroom caps
  w: "#fff8e8", // mushroom spots
  k: "#f1e4c3", // mushroom stalk
  c: "#f6c445", // flower heart
  "1": "#dcdecd", // stone highlight
  "2": "#b9bea9", // stone
  "3": "#98a08d", // stone shadow
  // Petal colours, swapped in for "P" one flower at a time.
  p: "#f4a7c0",
  W: "#fff8e8",
  y: "#f8d65a",
  v: "#c9b0ea",
  u: "#a9cdf2",
};

const PETALS = ["p", "W", "y", "v", "u"];
// White and yellow read as stray specks on the cup-shaped flowers, so those only come in the deeper colours.
const DEEP_PETALS = ["p", "v", "u"];

type Grid = readonly string[];

const BUSH: Grid = [
  "....oo..ooo...",
  "..oogGooggGoo.",
  ".ogGGggogGGggo",
  "ogGggbgggggbgo",
  "oggbbggbggbbgo",
  "obgbbbbbbbbbbo",
  ".obbbbbbbbbbo.",
  "..oooooooooo..",
  "..ssssssssss..",
];

const BERRY_BUSH: Grid = [
  "...ooo..oo....",
  ".oogGgoogGoo..",
  "ogGGgrgogGggo.",
  "ogggggbggrggbo",
  "obrgbbggbgbbbo",
  "obbbbbbbbbrbo.",
  ".oobbbbbbbboo.",
  "...oooooooo...",
  "...ssssssss...",
];

const SHRUB: Grid = [
  "..oooo..",
  ".ogGggo.",
  "ogGgbggo",
  "obgbbbbo",
  ".oooooo.",
  ".ssssss.",
];

const DAISIES: readonly Grid[] = [
  [".P.", "PcP", ".P."],
  [".P....", "PcP.P.", ".P.PcP", "....P."],
];

const CUPS: readonly Grid[] = [
  ["P.P", "PPP", ".d."],
  [".P.", "PPP", "d.d"],
  ["P...", ".d.P", ".d.d"],
];

const DETAILS: readonly Grid[] = [
  [".rr.", "rwrr", ".kk."],
  [".rr....", "rwrr.r.", ".kk.rwr", "....k.."],
  [".11.", "1223", ".33."],
  ["12...", "23.1.", "...23"],
  [".l.l.", "lllll", ".lll.", "..d.."],
];

const TUFTS: readonly Grid[] = [
  ["d.d", ".d."],
  ["t...t", "d.d.d", ".d.d."],
  ["t..", "d.t", ".dd"],
  [".t.", "d.d"],
  ["t.t.", "d.d.", ".d.d"],
];

// Wraps every coordinate, so a motif crossing one edge of the tile continues from the opposite edge.
export class MeadowCanvas {
  readonly pixels: (string | undefined)[];
  private readonly taken: Uint8Array;

  constructor(readonly size: number) {
    this.pixels = new Array(size * size);
    this.taken = new Uint8Array(size * size);
  }

  private index(x: number, y: number) {
    const s = this.size;
    return (((y % s) + s) % s) * s + (((x % s) + s) % s);
  }

  get(x: number, y: number) {
    return this.pixels[this.index(x, y)];
  }

  set(x: number, y: number, color: string) {
    this.pixels[this.index(x, y)] = color;
  }

  // Free when nothing else sits within `pad` pixels, so motifs never overlap or crowd each other.
  isFree(x: number, y: number, grid: Grid, pad: number) {
    const w = Math.max(...grid.map((r) => r.length));
    for (let j = -pad; j < grid.length + pad; j++) {
      for (let i = -pad; i < w + pad; i++) if (this.taken[this.index(x + i, y + j)]) return false;
    }
    return true;
  }

  stamp(x: number, y: number, grid: Grid, swaps: Record<string, string> = {}) {
    grid.forEach((row, j) => {
      [...row].forEach((ch, i) => {
        if (ch === ".") return;
        const key = swaps[ch] ?? ch;
        this.set(x + i, y + j, MEADOW_PALETTE[key]);
        this.taken[this.index(x + i, y + j)] = 1;
      });
    });
  }
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth value noise that repeats every `size` pixels, so the light and shade patches tile without a seam too.
function periodicNoise(rand: () => number, size: number, cell: number) {
  const n = size / cell;
  const values = Array.from({ length: n * n }, rand);
  const at = (i: number, j: number) => values[(j % n) * n + (i % n)];
  const ease = (f: number) => f * f * (3 - 2 * f);
  return (x: number, y: number) => {
    const i = Math.floor(x / cell);
    const j = Math.floor(y / cell);
    const fx = ease(x / cell - i);
    const fy = ease(y / cell - j);
    const top = at(i, j) + (at(i + 1, j) - at(i, j)) * fx;
    const bottom = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * fx;
    return top + (bottom - top) * fy;
  };
}

export function drawMeadow(seed = SEED) {
  const size = MEADOW_SIZE;
  const rand = mulberry32(seed);
  const pick = <T>(list: readonly T[]) => list[Math.floor(rand() * list.length)];
  const canvas = new MeadowCanvas(size);

  const broad = periodicNoise(rand, size, 48);
  const fine = periodicNoise(rand, size, 16);
  const light = (x: number, y: number) => broad(x, y) * 0.7 + fine(x, y) * 0.3;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const v = light(x, y);
      if (v < 0.36) canvas.set(x, y, MEADOW_PALETTE["-"]);
      else if (v > 0.64) canvas.set(x, y, MEADOW_PALETTE["+"]);
    }
  }

  const scatter = (count: number, grids: readonly Grid[], pad: number, swaps?: () => Record<string, string>) => {
    for (let placed = 0, tries = 0; placed < count && tries < count * 60; tries++) {
      const grid = pick(grids);
      const x = Math.floor(rand() * size);
      const y = Math.floor(rand() * size);
      if (!canvas.isFree(x, y, grid, pad)) continue;
      canvas.stamp(x, y, grid, swaps?.());
      placed++;
    }
  };

  // Biggest first, with wide gaps between bushes so they never clump into a hedge.
  scatter(4, [BUSH, BERRY_BUSH, SHRUB, SHRUB], 18);
  scatter(7, DETAILS, 8);
  scatter(16, DAISIES, 5, () => ({ P: pick(PETALS) }));
  scatter(12, CUPS, 5, () => ({ P: pick(DEEP_PETALS) }));

  // Blades lean sunlit in sunlit patches and darker in shade, which gives the ground its depth.
  for (let placed = 0, tries = 0; placed < 120 && tries < 6000; tries++) {
    const grid = pick(TUFTS);
    const x = Math.floor(rand() * size);
    const y = Math.floor(rand() * size);
    if (!canvas.isFree(x, y, grid, 2)) continue;
    const sunlit = light(x, y) > 0.5 && rand() < 0.75;
    canvas.stamp(x, y, grid, sunlit ? { d: "l" } : { t: rand() < 0.5 ? "d" : "t" });
    placed++;
  }

  for (let i = 0; i < 220; i++) {
    const x = Math.floor(rand() * size);
    const y = Math.floor(rand() * size);
    if (canvas.isFree(x, y, ["."], 1)) canvas.stamp(x, y, [rand() < 0.5 ? "d" : "l"]);
  }

  return canvas;
}

// One path per colour; runs of a colour that repeat on the next row merge into one taller rectangle.
export function meadowSvg(canvas = drawMeadow()) {
  const { size } = canvas;
  const byColor = new Map<string, string[]>();
  let open = new Map<string, { y: number; h: number }>();
  const close = (key: string, rect: { y: number; h: number }) => {
    const [color, x, w] = key.split("|");
    const parts = byColor.get(color) ?? [];
    parts.push(`M${x} ${rect.y}h${w}v${rect.h}h-${w}z`);
    byColor.set(color, parts);
  };
  for (let y = 0; y <= size; y++) {
    const next = new Map<string, { y: number; h: number }>();
    for (let x = 0; y < size && x < size; ) {
      const color = canvas.get(x, y);
      let w = 1;
      while (x + w < size && canvas.get(x + w, y) === color) w++;
      if (color) {
        const key = `${color}|${x}|${w}`;
        const rect = open.get(key);
        if (rect) {
          rect.h++;
          open.delete(key);
          next.set(key, rect);
        } else next.set(key, { y, h: 1 });
      }
      x += w;
    }
    open.forEach((rect, key) => close(key, rect));
    open = next;
  }
  const paths = [...byColor].map(([color, parts]) => `<path fill="${color}" d="${parts.join("")}"/>`).join("");
  const px = size * SCALE;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">${paths}</svg>`;
}
