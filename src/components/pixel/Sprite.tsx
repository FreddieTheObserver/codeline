import { PALETTE, type SpriteGrid } from "./sprites";

type Props = {
  grid: SpriteGrid;
  scale?: number;
  overrides?: Record<string, string>;
  title?: string;
  className?: string;
};

// Draws a character grid as crisp SVG rects, merging runs of one colour per row.
export function Sprite({ grid, scale = 4, overrides, title, className }: Props) {
  const width = Math.max(...grid.map((r) => r.length));
  const height = grid.length;
  const rects: { x: number; y: number; w: number; fill: string }[] = [];
  grid.forEach((row, y) => {
    let x = 0;
    while (x < width) {
      const ch = row[x] ?? ".";
      if (ch === ".") {
        x++;
        continue;
      }
      let run = 1;
      while (x + run < width && (row[x + run] ?? ".") === ch) run++;
      rects.push({ x, y, w: run, fill: overrides?.[ch] ?? PALETTE[ch] ?? "#000" });
      x += run;
    }
  });
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width * scale}
      height={height * scale}
      shapeRendering="crispEdges"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  );
}
