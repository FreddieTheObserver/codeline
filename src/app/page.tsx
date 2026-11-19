import { ValleyScene } from "@/components/ValleyScene";
import { Panel } from "@/components/ui";
import { SiteFooter } from "@/components/SiteFooter";
import { Sprite } from "@/components/pixel/Sprite";
import { BLOOM, SEED, SIGN, SPROUT } from "@/components/pixel/sprites";
import { LandingActions } from "./LandingActions";

const STEPS = [
  {
    art: <Sprite grid={SIGN} scale={4} />,
    title: "Read the signposts",
    text: "Your lecturer prepares an algorithm in plain words. Each step is a signpost beside an empty plot.",
  },
  {
    art: <Sprite grid={SEED} scale={5} />,
    title: "Plant your seeds",
    text: "You get a pouch of real code lines. Tap a seed, then the plot where it belongs. A wrong plot wilts, so try again.",
  },
  {
    art: (
      <span className="flex gap-1">
        <Sprite grid={SPROUT} scale={4} />
        <Sprite grid={BLOOM} scale={4} />
      </span>
    ),
    title: "Grow it together",
    text: "The projector shows the whole class garden growing. Earn points, level up and fill your almanac.",
  },
];

export default function Landing() {
  return (
    <>
      <main id="main" className="flex flex-1 flex-col">
        <ValleyScene>
          <div className="mx-auto flex max-w-3xl flex-col items-center px-4 pb-32 pt-16 text-center">
            <h1 className="font-pixel text-6xl text-ink drop-shadow-[3px_3px_0_#fbf3df] sm:text-7xl">CodeLine</h1>
            <p className="mt-3 max-w-xl font-pixel text-xl text-ink">Turn plain-words algorithms into code, one seed at a time.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <LandingActions />
            </div>
          </div>
        </ValleyScene>

        <ol className="page-container grid gap-4 py-8 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex">
              <Panel className="flex w-full flex-col">
                <div className="flex h-12 items-end">{s.art}</div>
                <h2 className="mt-3 font-pixel text-lg">
                  <span className="sr-only">Step {i + 1}: </span>
                  {s.title}
                </h2>
                <p className="mt-1 text-sm">{s.text}</p>
              </Panel>
            </li>
          ))}
        </ol>
      </main>
      <SiteFooter />
    </>
  );
}
