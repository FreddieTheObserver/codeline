import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { Heading, PageHeader, Panel } from "@/components/ui";

export const metadata: Metadata = { title: "About" };

const FLOW = [
  ["The lecturer prepares an Exercise", "They paste the solution code, write a plain-words step beside each line, and mark lines everyone gets for free."],
  ["Students join the Session", "They enter the course's join code once, or scan it from the projector, then wait at the gate for the first Round."],
  ["Everyone plants their seeds", "Each student holds a few real lines of code and plants each one beside the step it belongs to. A wrong plot wilts, so they try again."],
  ["The class garden grows", "The projector combines every Board, so the room sees which steps are solved and which ones the class finds hard."],
  ["The lecturer reviews", "The dashboard shows each student's decisions and reasons, and the steps worth reteaching."],
];

export default function AboutPage() {
  return (
    <PageShell>
      <PageHeader title="About CodeLine" description="A classroom exercise for turning an algorithm in plain words into code." />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Panel>
            <Heading>What it is</Heading>
            <p className="mt-2">
              Each step of the algorithm is a signpost beside an empty plot, and each student holds seeds: real lines of the program. Students plant each seed in
              the plot where it belongs, on their own device, while the projector shows the whole class garden growing.
            </p>
            <p className="mt-2">It is an interactive prototype built for a systems analysis course project, and it works for any programming language.</p>
          </Panel>
          <Panel>
            <Heading>How a Session works</Heading>
            <ol className="mt-3 flex flex-col gap-3">
              {FLOW.map(([title, text], i) => (
                <li key={title} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
                  <span className="flex h-8 w-8 items-center justify-center bg-wood font-pixel text-parchment" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span>
                    <span className="block font-bold">{title}</span>
                    <span className="block text-sm">{text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
        <div className="flex flex-col gap-4">
          <Panel>
            <Heading>Try the demo</Heading>
            <p className="mt-2 text-sm">The courses, exercises, past Sessions and most students are sample data, marked &ldquo;Sample data&rdquo; or &ldquo;simulated&rdquo;.</p>
            <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
              <dt className="font-bold">Lecturer</dt>
              <dd className="font-mono">lecturer</dd>
              <dt className="font-bold">Teaching assistant</dt>
              <dd className="font-mono">ta</dd>
              <dt className="font-bold">Student</dt>
              <dd className="font-mono">student</dd>
              <dt className="font-bold">Password</dt>
              <dd className="font-mono">codeline-demo</dd>
            </dl>
          </Panel>
          <Panel>
            <Heading>Credits</Heading>
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm">
              <li>Pixel art: drawn for CodeLine as code, in the spirit of cozy farming games.</li>
              <li>Sound effects: generated in the browser with the Web Audio API.</li>
              <li>Fonts: Pixelify Sans, Nunito and JetBrains Mono, under the SIL Open Font License, via Google Fonts.</li>
            </ul>
          </Panel>
        </div>
      </div>
    </PageShell>
  );
}
