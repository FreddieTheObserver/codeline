import { Sprite } from "./pixel/Sprite";
import { BLOOM, CLOUD, FENCE, SPROUT, SUN, TREE } from "./pixel/sprites";

export function ValleyScene({ children, compact }: { children?: React.ReactNode; compact?: boolean }) {
  return (
    // The sky stops at the horizon, 6rem above the bottom, so the ground below it is the page meadow itself and joins the
    // meadow under the scene without a seam. Its stops are shifted so the sky keeps the colours of a full-height gradient.
    <div
      className={`relative overflow-hidden ${compact ? "min-h-[220px]" : "min-h-[420px]"}`}
      style={{ background: "linear-gradient(#8fcbea, #bfe3f5 calc(60% + 3.6rem), #d8f0d0 calc(100% + 6rem)) top / 100% calc(100% - 6rem) no-repeat" }}
    >
      <div className="absolute right-[8%] top-6">
        <Sprite grid={SUN} scale={7} />
      </div>
      <div className="absolute top-10 opacity-90" style={{ animation: "drift 70s linear infinite" }}>
        <Sprite grid={CLOUD} scale={6} />
      </div>
      <div className="absolute top-24 opacity-80" style={{ animation: "drift 95s linear infinite", animationDelay: "-40s" }}>
        <Sprite grid={CLOUD} scale={4} />
      </div>
      <div className="absolute inset-x-0 h-[6px] bg-grass-light" style={{ top: "calc(100% - 6rem)" }} />
      <div className="absolute bottom-16 left-[4%]">
        <Sprite grid={TREE} scale={7} />
      </div>
      <div className="absolute bottom-14 right-[5%] hidden sm:block">
        <Sprite grid={TREE} scale={6} />
      </div>
      <div className="absolute bottom-6 left-[22%] flex gap-0">
        {Array.from({ length: 5 }, (_, i) => (
          <Sprite key={i} grid={FENCE} scale={4} />
        ))}
      </div>
      <div className="absolute bottom-5 right-[24%] flex gap-3">
        <Sprite grid={SPROUT} scale={4} />
        <Sprite grid={BLOOM} scale={4} />
        <Sprite grid={SPROUT} scale={4} />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
