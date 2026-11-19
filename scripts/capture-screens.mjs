// Drives the real app through every business process and saves screenshots.
// Usage: node scripts/capture-screens.mjs <baseUrl> <outDir>
// Needs freshly seeded sample data (bun run db:seed -- --reset) and a running server.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { requireLocalServer } from "./local-only.mjs";

const BASE = process.argv[2] ?? "http://localhost:3210";
requireLocalServer(BASE);
const OUT = process.argv[3] ?? "screens";
mkdirSync(OUT, { recursive: true });
const PASSWORD = "codeline-demo";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ channel: "msedge" });

async function actor(loginId, viewport = { width: 1440, height: 900 }) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  if (loginId) {
    const res = await context.request.post(`${BASE}/api/auth/signin`, { data: { loginId, password: PASSWORD } });
    if (!res.ok()) throw new Error(`sign-in failed for ${loginId}: ${res.status()}`);
  }
  const page = await context.newPage();
  page.on("pageerror", (e) => console.log(`[${loginId ?? "guest"}] page error:`, e.message));
  return { context, page, api: context.request };
}

// Full-page shots grow the viewport to the page first, so sticky bars sit where they belong instead of mid-page.
async function shot(page, name, { full = false } = {}) {
  await wait(500);
  const viewport = page.viewportSize();
  if (full) {
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ width: viewport.width, height: Math.max(viewport.height, height) });
    await wait(300);
  }
  await page.screenshot({ path: join(OUT, `${name}.png`) });
  if (full) await page.setViewportSize(viewport);
  console.log("saved", name);
}

// Confirms the in-app dialog if the last action opened one.
async function confirmIfAsked(page, label) {
  const button = page.getByRole("dialog").getByRole("button", { name: label, exact: true });
  try {
    await button.waitFor({ state: "visible", timeout: 1500 });
    await button.click();
  } catch {}
}

async function go(page, path) {
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await wait(400);
}

const guest = await actor(null);
const lecturer = await actor("lecturer");
const student = await actor("student");
const phone = await actor("student", { width: 390, height: 844 });
const ta = await actor("ta");

// Close any Session left open by an earlier run.
const teach = await (await lecturer.api.get(`${BASE}/api/teach`)).json();
const csc101 = teach.courses.find((c) => c.code === "CSC101");
if (csc101.live) await lecturer.api.post(`${BASE}/api/sessions/${csc101.live.sessionId}/control`, { data: { action: "close" } });
const detail = await (await lecturer.api.get(`${BASE}/api/courses/${csc101.id}`)).json();
const findMax = detail.exercises.find((e) => e.title === "FindMax");
const sumEvens = detail.exercises.find((e) => e.title === "SumOfEvens");

// 1. Sign up and sign in
await go(guest.page, "/");
await shot(guest.page, "01-landing");
await go(guest.page, "/signup");
await guest.page.fill("input[autocomplete=username]", "68130500999");
await guest.page.fill("input[autocomplete=name]", "Napat Wongsa");
await guest.page.fill("input[type=password]", "my-garden-pass");
await shot(guest.page, "02-signup");
await go(guest.page, "/signin");
await shot(guest.page, "03-signin");

// 2. Prepare an Exercise
await go(lecturer.page, "/teach");
await shot(lecturer.page, "10-teach-home");
await go(lecturer.page, `/teach/courses/${csc101.id}`);
await shot(lecturer.page, "11-course-exercises");
await go(lecturer.page, `/teach/courses/${csc101.id}/exercises/new`);
await lecturer.page.fill("input[placeholder=FindMax]", "SumOfOdds");
await lecturer.page.fill("textarea", [
  "public class SumOfOdds {",
  "    public static void main(String[] args) {",
  "        int sum = 0;",
  "        for (int i = 1; i <= 9; i += 2) {",
  "            sum += i;",
  "        }",
  '        System.out.println("Sum: " + sum);',
  "    }",
  "}",
].join("\n"));
await lecturer.page.click("text=Split into rows");
const steps = ["Define the program SumOfOdds", "Start main", "Set sum to 0", "For each odd number i from 1 to 9", "Add i to sum", "End for", "Print sum", "End main", "End program"];
const inputs = lecturer.page.locator("input[aria-label^='Pseudocode step']");
for (let i = 0; i < steps.length; i++) await inputs.nth(i).fill(steps[i]);
await shot(lecturer.page, "12-exercise-new", { full: true });
await go(lecturer.page, `/teach/exercises/${findMax.id}`);
await lecturer.page.click("text=Start test play");
await wait(300);
await lecturer.page.locator("button[aria-pressed]").first().click();
await shot(lecturer.page, "13-exercise-edit-testplay", { full: true });

// 3. Run a Session: set up, Lobby, join
await go(lecturer.page, `/teach/courses/${csc101.id}`);
await lecturer.page.click("role=tab[name='Run a Session']");
await lecturer.page.click("text=Add a Round");
await lecturer.page.locator("select").nth(1).selectOption(sumEvens.id);
await shot(lecturer.page, "20-session-setup", { full: true });
const created = await (
  await lecturer.api.post(`${BASE}/api/sessions`, {
    data: {
      courseId: csc101.id,
      mode: "solo",
      handSize: 3,
      teamCount: 4,
      rounds: [
        { exerciseId: findMax.id, timeLimitS: 300 },
        { exerciseId: sumEvens.id, timeLimitS: 240 },
      ],
    },
  })
).json();
const sid = created.id;
await lecturer.api.post(`${BASE}/api/sessions/${sid}/bots`, { data: { count: 34 } });
await go(student.page, "/home");
await shot(student.page, "21-student-home-live");
await go(student.page, `/play/${sid}`);
await shot(student.page, "22-student-lobby");
await go(lecturer.page, `/projector/${sid}`);
await shot(lecturer.page, "23-projector-lobby");
const consolePage = await lecturer.context.newPage();
await go(consolePage, `/console/${sid}`);
await shot(consolePage, "24-console-lobby");

// 4. Play a Round
await consolePage.click("text=Start Round 1");
await wait(1500);
await go(student.page, `/play/${sid}`);
await shot(student.page, "30-play-start");
const rows = (await (await lecturer.api.get(`${BASE}/api/exercises/${findMax.id}`)).json()).rows.map((r, position) => ({ ...r, position }));
const positionOf = (code) => rows.find((r) => r.code === code && !r.given)?.position;
const cards = student.page.locator("[aria-label='Your seeds'] button");
const firstCode = (await cards.nth(0).innerText()).trim();
await cards.nth(0).click();
await shot(student.page, "31-play-seed-selected");
const right = positionOf(firstCode);
const wrong = rows.find((r) => !r.given && r.position !== right)?.position;
await student.page.click(`button[aria-label^='Plot ${wrong + 1},']`);
await wait(700);
await shot(student.page, "32-play-wilt");
await student.page.click(`button[aria-label^='Plot ${right + 1},']`);
await wait(700);
await student.page.fill("input[placeholder^='Why plot']", "We need the scores before we can look for the biggest one.");
await shot(student.page, "33-play-bloom-why");
await student.page.getByRole("button", { name: "Save", exact: true }).click();
await wait(600);
await go(phone.page, `/play/${sid}`);
await shot(phone.page, "34-play-phone");
await wait(6000);
await go(lecturer.page, `/projector/${sid}`);
await wait(1500);
await shot(lecturer.page, "35-projector-round");
const consoleState = await (await lecturer.api.get(`${BASE}/api/sessions/${sid}/console`)).json();
const reasoned = consoleState.placements.find((p) => p.reason && p.correct);
if (reasoned) await lecturer.api.post(`${BASE}/api/sessions/${sid}/spotlight`, { data: { placementId: reasoned.id } });
await wait(1600);
await shot(consolePage, "36-console-round");
await wait(1200);
await shot(lecturer.page, "37-projector-spotlight");

// Finish the student's Hand, then reveal.
for (let i = 0; i < 3; i++) {
  const open = student.page.locator("[aria-label='Your seeds'] button:not([disabled])");
  if ((await open.count()) === 0) break;
  const code = (await open.first().innerText()).trim();
  await open.first().click();
  const pos = rows.filter((r) => r.code === code && !r.given).map((r) => r.position);
  for (const p of pos) {
    const plot = student.page.locator(`button[aria-label^='Plot ${p + 1},']`);
    if (await plot.isEnabled()) {
      await plot.click();
      break;
    }
  }
  await wait(600);
}
await consolePage.click("text=Reveal solution");
await confirmIfAsked(consolePage, "Reveal solution");
await wait(1500);
await go(student.page, `/play/${sid}`);
await shot(student.page, "38-play-result-reveal", { full: true });
await go(lecturer.page, `/projector/${sid}`);
await wait(1200);
await shot(lecturer.page, "39-projector-reveal");

// Close and review progress
await lecturer.api.post(`${BASE}/api/sessions/${sid}/control`, { data: { action: "close" } });
await go(lecturer.page, `/projector/${sid}`);
await shot(lecturer.page, "40-projector-finale");
await go(student.page, `/play/${sid}`);
await shot(student.page, "41-play-closed");
await go(student.page, "/profile");
await shot(student.page, "42-profile", { full: true });
await go(lecturer.page, `/teach/courses/${csc101.id}/sessions/${sid}`);
await shot(lecturer.page, "43-session-summary", { full: true });
await go(lecturer.page, `/teach/courses/${csc101.id}`);
await lecturer.page.click("role=tab[name='Dashboard']");
await wait(1200);
await shot(lecturer.page, "50-dashboard", { full: true });
const dash = await (await lecturer.api.get(`${BASE}/api/courses/${csc101.id}/dashboard`)).json();
const demo = dash.students.find((s) => s.loginId === "student");
await go(lecturer.page, `/teach/courses/${csc101.id}/students/${demo.userId}`);
await shot(lecturer.page, "51-student-detail", { full: true });
await go(ta.page, "/ta");
await shot(ta.page, "60-ta-overview", { full: true });
await go(guest.page, "/about");
await shot(guest.page, "70-about", { full: true });

await browser.close();
console.log("done");
