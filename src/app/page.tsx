import Link from "next/link";
import { ValleyScene } from "@/components/ValleyScene";
import { ButtonLink, Panel } from "@/components/ui";
import { Sprite } from "@/components/pixel/Sprite";
import { BLOOM, SEED, SIGN, SPROUT } from "@/components/pixel/sprites";
import { ContinueLink } from "./ContinueLink";

export default function Landing() {
  return (
    <main className="flex flex-1 flex-col">
      <ValleyScene>
        <div className="mx-auto flex max-w-3xl flex-col items-center px-4 pb-32 pt-16 text-center">
          <h1 className="font-pixel text-6xl text-ink drop-shadow-[3px_3px_0_#fbf3df] sm:text-7xl">CodeLine</h1>
          <p className="mt-3 max-w-xl font-pixel text-xl text-ink">Turn plain-words algorithms into code, one seed at a time.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <ContinueLink />
            <ButtonLink href="/signup">Create an account</ButtonLink>
            <ButtonLink href="/signin" tone="secondary">
              Sign in
            </ButtonLink>
          </div>
        </div>
      </ValleyScene>

      <div className="mx-auto grid w-full max-w-5xl gap-4 px-3 py-8 sm:grid-cols-3">
        <Panel>
          <Sprite grid={SIGN} scale={4} />
          <h2 className="mt-2 font-pixel text-lg">Read the signposts</h2>
          <p className="text-sm">Your lecturer prepares an algorithm in plain words. Each step is a signpost beside an empty plot.</p>
        </Panel>
        <Panel>
          <Sprite grid={SEED} scale={5} />
          <h2 className="mt-2 font-pixel text-lg">Plant your seeds</h2>
          <p className="text-sm">You get a pouch of real code lines. Tap a seed, then the plot where it belongs. A wrong plot wilts, so try again.</p>
        </Panel>
        <Panel>
          <div className="flex gap-1">
            <Sprite grid={SPROUT} scale={4} />
            <Sprite grid={BLOOM} scale={4} />
          </div>
          <h2 className="mt-2 font-pixel text-lg">Grow it together</h2>
          <p className="text-sm">The projector shows the whole class garden growing. Earn points, level up and fill your almanac.</p>
        </Panel>
      </div>
      <footer className="pb-6 text-center text-sm text-ink">
        <Link href="/about" className="underline">
          About CodeLine
        </Link>
      </footer>
    </main>
  );
}
