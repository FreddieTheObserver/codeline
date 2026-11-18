import type { Metadata } from "next";
import Link from "next/link";
import { Panel, Title, Heading } from "@/components/ui";
import { ValleyScene } from "@/components/ValleyScene";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <main className="flex flex-1 flex-col">
      <ValleyScene compact>
        <div className="mx-auto max-w-3xl px-4 pt-12 text-center">
          <Title className="text-5xl">About CodeLine</Title>
        </div>
      </ValleyScene>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-3 py-6">
        <Panel>
          <Heading>What it is</Heading>
          <p className="mt-2">
            CodeLine is a classroom exercise for turning an algorithm in plain words into code. Each step of the algorithm is a signpost beside an empty plot, and
            each student holds seeds: real lines of the program. Students plant each seed in the plot where it belongs, on their own device, while the projector
            shows the whole class garden growing.
          </p>
          <p className="mt-2">It is an interactive prototype built for a systems analysis course project. It works for any programming language.</p>
        </Panel>
        <Panel>
          <Heading>Sample data</Heading>
          <p className="mt-2">
            The courses, exercises, past sessions and most students you see are sample data, marked &ldquo;Sample data&rdquo; or &ldquo;simulated&rdquo;. Demo accounts:
            <code className="mx-1 font-mono">lecturer</code>, <code className="mx-1 font-mono">ta</code> and <code className="mx-1 font-mono">student</code>, password
            <code className="mx-1 font-mono">codeline-demo</code>.
          </p>
        </Panel>
        <Panel>
          <Heading>Credits</Heading>
          <ul className="mt-2 list-disc pl-5">
            <li>Pixel art: drawn for CodeLine as code, in the spirit of cozy farming games.</li>
            <li>Sound effects: generated in the browser with the Web Audio API.</li>
            <li>Fonts: Pixelify Sans, Nunito and JetBrains Mono, under the SIL Open Font License, via Google Fonts.</li>
          </ul>
        </Panel>
        <Link href="/" className="text-center underline">
          Back to the start
        </Link>
      </div>
    </main>
  );
}
