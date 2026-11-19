// Builds the UI deliverable PDF: business processes leading to screens, each traced to its source.
// Usage: node scripts/build-pdf.mjs <screensDir> <out.pdf> <liveUrl>
import { chromium } from "playwright";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import QRCode from "qrcode";

// An optional fallback link (the *.vercel.app address) is printed too, in case the custom domain is not live yet.
const [, , SCREENS = "screens", OUT = "CodeLine-UI-Prototype.pdf", LIVE = "https://codeline.layaungphyo.dev", FALLBACK = ""] = process.argv;

// "*" marks answers where the stakeholder agreed to an option we offered: weaker evidence.
const S = (id, agreed = false) => ({ id, kind: "said", agreed });
const P = (label) => ({ id: label, kind: "ours" });

const processes = [
  {
    title: "1. Join CodeLine",
    actor: "Student",
    summary: "A student signs up with their student ID, signs in, and enters the course join code once. Live Sessions then appear on their home screen.",
    screens: [
      { file: "01-landing", title: "Landing page", text: "Explains the exercise in three steps.", src: [S("S1-HOD-09"), S("S1-IT-06")] },
      { file: "02-signup", title: "Sign up", text: "Student ID, name and password; classmates only ever see a nickname.", src: [S("S1-IT-05"), P("Nickname: team proposal")] },
      { file: "03-signin", title: "Sign in", text: "One sign-in page for students, lecturers and teaching assistants.", src: [S("S1-IT-05")] },
      { file: "21-student-home-live", title: "Student valley", text: "Courses, a join-code gate, and a Live now banner when a Session opens.", src: [P("Join code: team proposal"), P("Level and XP: team proposal")] },
    ],
  },
  {
    title: "2. Prepare an Exercise",
    actor: "Lecturer",
    summary: "Before class, the lecturer pastes the solution code, writes a plain-words step beside each line, marks structural lines as Given, and tries it as a student.",
    screens: [
      { file: "10-teach-home", title: "My courses", text: "Courses in any language, each with its join code.", src: [S("S1-HOD-08"), S("S1-LEC-16")] },
      { file: "11-course-exercises", title: "Course page", text: "Exercises prepared ahead of class.", src: [S("S1-LEC-01"), S("S1-LEC-15")] },
      { file: "12-exercise-new", title: "Paired-rows editor", text: "Paste code, it splits into rows; each row pairs a pseudocode step with its one correct line.", src: [S("S1-HOD-03"), S("S1-LEC-06"), P("Given rows: team proposal")] },
      { file: "13-exercise-edit-testplay", title: "Test play", text: "The lecturer plays the Exercise as a student before class.", src: [P("Team proposal")] },
    ],
  },
  {
    title: "3. Run a Session",
    actor: "Lecturer, projector, student",
    summary: "The lecturer sets up a playlist of Rounds, opens the Lobby, and students join by code or QR. The projector shows who has arrived.",
    screens: [
      { file: "20-session-setup", title: "Session setup", text: "Solo or Teams, seeds per student (one is the paper version), Rounds and time limits.", src: [S("S1-LEC-07", true), S("S1-LEC-08", true), S("S1-LEC-05"), P("More than one seed each: team proposal")] },
      { file: "23-projector-lobby", title: "Projector: Lobby", text: "QR code and join code; arriving nicknames sprout.", src: [P("Lobby and QR join: team proposal")] },
      { file: "24-console-lobby", title: "Lecturer console", text: "Private controls; real names and reasons stay here.", src: [S("S1-LEC-09")] },
      { file: "22-student-lobby", title: "Student: Lobby", text: "Waiting at the gate for the first Round.", src: [S("S1-IT-01")] },
    ],
  },
  {
    title: "4. Play a Round",
    actor: "Student",
    summary: "Each student gets a pouch of code lines (seeds) and plants each one in the plot beside the pseudocode step it belongs to. A wrong plot wilts and the student tries again until time runs out.",
    screens: [
      { file: "30-play-start", title: "The Board", text: "Pseudocode on the left, empty plots on the right, the student's own seeds below.", src: [S("S1-HOD-03"), S("S1-LEC-01"), S("S1-HOD-05", true)] },
      { file: "31-play-seed-selected", title: "Pick a seed", text: "Tap a seed, then a plot; drag and drop also works on laptops.", src: [S("S1-IT-01"), S("S1-IT-04")] },
      { file: "32-play-wilt", title: "Wrong plot", text: "Shown as wrong at once; the student may retry until the Round ends.", src: [S("S1-LEC-12")] },
      { file: "33-play-bloom-why", title: "Right plot, and why", text: "Points for accuracy first, speed second; an optional reason for the lecturer.", src: [S("S1-LEC-10", true), S("S1-LEC-14"), P("Points formula: team proposal")] },
      { file: "34-play-phone", fit: "contain", title: "On a phone", text: "Each step stacks above its plot; the seed pouch stays at the bottom.", src: [S("S1-IT-01")] },
    ],
  },
  {
    title: "5. Follow the class live and reveal",
    actor: "Lecturer and projector",
    summary: "The projector shows the class garden growing without giving answers away. The lecturer sees every decision and its reason, can pin a good reason, and reveals the solution live.",
    screens: [
      { file: "35-projector-round", title: "Projector: Class Board", text: "Each plot grows by how much of the class got it right; code stays hidden until the reveal.", src: [S("S1-LEC-08", true), P("Class Board: team proposal")] },
      { file: "36-console-round", title: "Console: every decision", text: "Real names, lines, steps, right or wrong, and reasons; hardest steps right now.", src: [S("S1-LEC-09"), S("S1-LEC-10", true)] },
      { file: "37-projector-spotlight", title: "Spotlight", text: "A pinned reason on the projector; the top 5 by nickname only.", src: [P("Spotlight and top 5: team proposal")] },
      { file: "39-projector-reveal", title: "Reveal", text: "The full solution, shown live to everyone.", src: [S("S1-LEC-11")] },
      { file: "38-play-result-reveal", title: "Student result", text: "Round points, private rank, harvest, and the revealed solution.", src: [S("S1-LEC-05"), S("S1-LEC-11")] },
    ],
  },
  {
    title: "6. Close and review progress",
    actor: "Lecturer and student",
    summary: "Closing the Session turns points into lasting XP. The lecturer looks back on each Round of the Session, and the course dashboard shows each student's progress and the steps the class finds hardest.",
    screens: [
      { file: "40-projector-finale", title: "Projector: finale", text: "The final noticeboard.", src: [P("Team proposal")] },
      { file: "42-profile", title: "Student profile", text: "Level, avatar items, Badges and the Almanac of harvested Exercises.", src: [P("Codedex-style progression: team proposal")] },
      { file: "43-session-summary", title: "Session summary", text: "Each Round of a closed Session: hardest steps, every decision with its reason, and each student's points.", src: [S("S1-LEC-09"), S("S1-HOD-12")] },
      { file: "50-dashboard", title: "Course dashboard", text: "Hardest steps with the most common wrong step; a sortable student table with trends.", src: [S("S1-HOD-12"), S("S1-HOD-07")] },
      { file: "51-student-detail", title: "One student", text: "Every Placement, try and reason across the course.", src: [S("S1-LEC-09"), S("S1-HOD-12")] },
    ],
  },
  {
    title: "7. Prepare a report for the lecturers",
    actor: "Teaching assistant",
    summary: "A teaching assistant reads every course and exports the numbers to prepare a report.",
    screens: [
      { file: "60-ta-overview", title: "Department overview", text: "Every course with participation, first-try accuracy, retries and its hardest step; CSV export.", src: [P("Teaching assistant role: team proposal"), P("Partly covers the reporting need in S1-HOD-11")] },
    ],
  },
];

const future = [
  ["Onsite-only access by IP address", "S1-LEC-04, S1-IT-02", "Lock each Session to the network of the lecturer who opens it; a refused student can knock."],
  ["Roster import with activation codes", "S1-IT-05", "Proves that a student ID belongs to the person signing up."],
  ["Head-of-department overview", "S1-HOD-11", "Left out of the prototype by team decision; the teaching assistant overview covers reporting."],
  ["200 students at the same time", "S1-IT-03", "The free hosting tier fits about 90 per Session; 200 needs the paid tier or a dedicated room server."],
];

const img = (name) => {
  const path = join(SCREENS, `${name}.png`);
  if (!existsSync(path)) throw new Error(`Missing screenshot ${path}`);
  return `data:image/png;base64,${readFileSync(path).toString("base64")}`;
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const chip = (s) =>
  s.kind === "said"
    ? `<span class="chip said">${esc(s.id)}${s.agreed ? "*" : ""}</span>`
    : `<span class="chip ours">${esc(s.id)}</span>`;

const qr = await QRCode.toDataURL(LIVE, { margin: 1, width: 320, color: { dark: "#3b2a1e", light: "#fbf3df" } });

const processPages = processes
  .map(
    (p) => `
  <section class="page">
    <header><p class="kicker">Business process · ${esc(p.actor)} · read the screens in number order</p><h2>${esc(p.title)}</h2><p class="summary">${esc(p.summary)}</p></header>
    <div class="flow n${p.screens.length}">
      ${p.screens
        .map(
          (s, i) => `
        <figure>
          <div class="step">${i + 1}</div>
          <img src="${img(s.file)}" alt="${esc(s.title)}"${s.fit ? ` style="object-fit:${s.fit}"` : ""}>
          <figcaption><strong>${esc(s.title)}</strong> ${esc(s.text)}<span class="chips">${s.src.map(chip).join("")}</span></figcaption>
        </figure>`,
        )
        .join("")}
    </div>
  </section>`,
  )
  .join("");

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@500;700&family=Nunito:wght@400;700;800&display=swap" rel="stylesheet">
<style>
  @page { size: A4 landscape; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Nunito, sans-serif; color: #3b2a1e; background: #fbf3df; }
  .page { width: 297mm; height: 210mm; padding: 11mm 13mm; page-break-after: always; display: flex; flex-direction: column; gap: 5mm; overflow: hidden; }
  h1, h2, .kicker, .step { font-family: "Pixelify Sans", monospace; }
  h1 { font-size: 46pt; margin: 0; }
  h2 { font-size: 22pt; margin: 0; }
  .kicker { margin: 0; font-size: 10pt; color: #7a4f2c; text-transform: uppercase; letter-spacing: .06em; }
  .summary { margin: 1mm 0 0; font-size: 11pt; max-width: 230mm; }
  .flow { flex: 1; display: grid; gap: 5mm 7mm; align-content: start; }
  .flow.n1 { grid-template-columns: 1fr; }
  .flow.n2, .flow.n4 { grid-template-columns: 1fr 1fr; }
  .flow.n3, .flow.n5 { grid-template-columns: 1fr 1fr 1fr; }
  .flow.n1 figure { display: grid; grid-template-columns: 1.7fr 1fr; gap: 6mm; align-items: start; }
  figure { margin: 0; position: relative; }
  img { width: 100%; object-fit: cover; object-position: top; border: 2px solid #3b2a1e; background: #7cbf5a; display: block; }
  .n1 img { height: 150mm; }
  .n2 img, .n3 img { height: 110mm; }
  .n4 img { height: 62mm; }
  .n5 img { height: 60mm; }
  .step { position: absolute; top: -3mm; left: -2mm; background: #f6c445; border: 2px solid #3b2a1e; width: 7mm; height: 7mm; display: grid; place-items: center; font-size: 11pt; z-index: 1; }
  figcaption { font-size: 9pt; margin-top: 1.5mm; line-height: 1.3; }
  .chips { display: flex; flex-wrap: wrap; gap: 1.2mm; margin-top: 1.5mm; }
  .chip { font-size: 7.4pt; padding: .4mm 1.6mm; border: 1.5px solid #3b2a1e; border-radius: 1mm; }
  .chip.said { background: #cfe9bf; }
  .chip.ours { background: #fde3b0; border-style: dashed; }
  .cover { background: linear-gradient(#8fcbea, #bfe3f5 55%, #7cbf5a 55%); justify-content: space-between; }
  .cover .card { background: #fbf3df; border: 3px solid #7a4f2c; padding: 7mm 9mm; display: grid; grid-template-columns: 1fr auto; gap: 8mm; align-items: center; }
  .cover code { font-size: 12pt; background: #ecdcb6; padding: .3mm 1.5mm; }
  .legend { display: flex; gap: 6mm; font-size: 10pt; align-items: center; flex-wrap: wrap; }
  table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  th, td { text-align: left; padding: 1.6mm 2mm; border-bottom: 1px solid #c9b48a; vertical-align: top; }
  th { font-family: "Pixelify Sans", monospace; font-weight: 500; }
</style></head><body>
  <section class="page cover">
    <div><p class="kicker">CSC213 Term Project 2 · User interface deliverable</p><h1>CodeLine</h1>
      <p style="font-size:15pt;margin:2mm 0 0;max-width:200mm">An interactive prototype: students turn an algorithm in plain words into code by planting each line of code beside the step it belongs to.</p></div>
    <div class="card">
      <div>
        <p style="margin:0;font-size:12pt"><strong>Try the working prototype:</strong> <code>${esc(LIVE)}</code>${FALLBACK ? ` (also <code>${esc(FALLBACK)}</code>)` : ""}</p>
        <p style="margin:2mm 0 0;font-size:11pt">Demo accounts (password <code>codeline-demo</code>): <code>lecturer</code>, <code>ta</code>, <code>student</code>. Or sign up as a new student and enter the join code <code>MEADOW</code>.</p>
        <p style="margin:2mm 0 0;font-size:10pt">Courses, Exercises, past Sessions and most students are sample data, marked as such in the app.</p>
        <div class="legend" style="margin-top:4mm"><span class="chip said">S1-LEC-12</span> from interview session 1 (29 Oct 2026), by answer ID <span class="chip said">S1-LEC-07*</span> the stakeholder agreed to an option we offered <span class="chip ours">Team proposal</span> our proposal, not yet confirmed</div>
        <p style="margin:3mm 0 0;font-size:10pt">Each following page is one business process, shown as the screens it leads to, in order.</p>
      </div>
      <img src="${qr}" style="width:48mm;height:48mm;border:none" alt="QR code to the prototype">
    </div>
  </section>
  ${processPages}
  <section class="page">
    <header><p class="kicker">Scope</p><h2>Not in this prototype: future work</h2><p class="summary">Needs the stakeholders raised that the prototype leaves for later, with the reason.</p></header>
    <table><thead><tr><th>Need</th><th>Source</th><th>Plan</th></tr></thead><tbody>
      ${future.map(([a, b, c]) => `<tr><td><strong>${esc(a)}</strong></td><td>${esc(b)}</td><td>${esc(c)}</td></tr>`).join("")}
    </tbody></table>
    <header style="margin-top:4mm"><h2>Screen inventory</h2></header>
    <table><thead><tr><th>Process</th><th>Screens</th></tr></thead><tbody>
      ${processes.map((p) => `<tr><td><strong>${esc(p.title)}</strong></td><td>${p.screens.map((s) => esc(s.title)).join(" · ")}</td></tr>`).join("")}
    </tbody></table>
  </section>
</body></html>`;

const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({ path: OUT, width: "297mm", height: "210mm", printBackground: true });
await browser.close();
console.log("saved", OUT);
