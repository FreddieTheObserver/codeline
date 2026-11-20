// Records the footage for the demo video: drives one live CSC101 Session through the real app and
// films each view (lecturer laptop, student laptop, student phone, lecturer phone console, projector).
// Usage: node scripts/record-demo.mjs <baseUrl> <outDir>
// Needs freshly seeded sample data, ffmpeg on PATH, and a production server (`next start`), so the
// dev badge stays out of frame. Writes one MP4 per view plus markers.json, all on one clock.
import { chromium } from "playwright";
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { requireLocalServer } from "./local-only.mjs";

const BASE = process.argv[2] ?? "http://localhost:3210";
requireLocalServer(BASE);
const OUT = resolve(process.argv[3] ?? "footage");
const FRAMES = join(OUT, ".frames");
const PASSWORD = "codeline-demo";
const FPS = 30;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T0 = Date.now() / 1000;
const clock = () => Date.now() / 1000 - T0;

rmSync(FRAMES, { recursive: true, force: true });
mkdirSync(FRAMES, { recursive: true });

const marks = {};
function mark(name) {
  marks[name] = Number(clock().toFixed(3));
  console.log(`${marks[name].toFixed(1).padStart(6)}s  ${name}`);
}

// Headless pages draw no pointer, so each page gets a drawn arrow (laptops) and a ripple on every
// press (laptops and phones). The arrow's position survives navigation through sessionStorage.
function overlayScript({ arrow }) {
  const KEY = "__demoCursor";
  const css = (el, s) => Object.assign(el.style, s);
  let cursor = null;
  const place = (x, y) => {
    if (cursor) cursor.style.transform = `translate(${x - 3}px, ${y - 2}px)`;
  };
  const install = () => {
    if (!document.body || document.getElementById(KEY)) return;
    if (arrow) {
      cursor = document.createElement("div");
      cursor.id = KEY;
      cursor.innerHTML =
        '<svg width="30" height="30" viewBox="0 0 24 24"><path d="M3 2v17l4.5-4 3 7 3-1.3-2.9-6.7H17z" fill="#fff" stroke="#1d1a14" stroke-width="1.6" stroke-linejoin="round"/></svg>';
      css(cursor, { position: "fixed", left: "0", top: "0", zIndex: "2147483647", pointerEvents: "none", filter: "drop-shadow(0 2px 2px rgba(0,0,0,.35))" });
      document.body.appendChild(cursor);
      let saved = null;
      try {
        saved = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
      } catch {}
      saved ??= { x: innerWidth * 0.62, y: innerHeight * 0.58 };
      place(saved.x, saved.y);
    } else {
      const marker = document.createElement("div");
      marker.id = KEY;
      document.body.appendChild(marker);
    }
  };
  addEventListener(
    "mousemove",
    (e) => {
      place(e.clientX, e.clientY);
      try {
        sessionStorage.setItem(KEY, JSON.stringify({ x: e.clientX, y: e.clientY }));
      } catch {}
    },
    true,
  );
  addEventListener(
    "pointerdown",
    (e) => {
      const size = e.pointerType === "touch" ? 64 : 44;
      const ring = document.createElement("div");
      css(ring, {
        position: "fixed",
        left: `${e.clientX - size / 2}px`,
        top: `${e.clientY - size / 2}px`,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        border: "4px solid #f6c445",
        background: "rgba(246,196,69,.25)",
        zIndex: "2147483646",
        pointerEvents: "none",
      });
      document.body.appendChild(ring);
      ring.animate([{ transform: "scale(.4)", opacity: 1 }, { transform: "scale(1.3)", opacity: 0 }], { duration: 550, easing: "ease-out" }).onfinish = () => ring.remove();
    },
    true,
  );
  // Appending only after load keeps React's hydration of <body> clear of the extra node.
  addEventListener("load", () => setTimeout(install, 300));
  setInterval(install, 500);
}

async function camera(name, { loginId, viewport, scale, mobile = false, overlay = true }) {
  // The screencast sends frames at the browser's real scale, not the emulated one, so the real scale is
  // forced to match the emulated one; frames then arrive at full device resolution.
  const browser = await chromium.launch({
    channel: "msedge",
    args: [
      `--force-device-scale-factor=${scale}`,
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--disable-backgrounding-occluded-windows",
    ],
  });
  const context = await browser.newContext({ viewport, deviceScaleFactor: scale, isMobile: mobile, hasTouch: mobile });
  if (overlay) await context.addInitScript(overlayScript, { arrow: !mobile });
  const res = await context.request.post(`${BASE}/api/auth/signin`, { data: { loginId, password: PASSWORD } });
  if (!res.ok()) throw new Error(`sign-in failed for ${loginId}: ${res.status()}`);
  const page = await context.newPage();
  page.on("pageerror", (e) => console.log(`[${name}] page error:`, e.message));
  const cdp = await context.newCDPSession(page);
  mkdirSync(join(FRAMES, name));
  const frames = [];
  const writes = [];
  const takes = [];
  let rolling = false;
  cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
    cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
    if (!rolling) return;
    const file = `${name}/f${String(frames.length).padStart(6, "0")}.jpg`;
    writes.push(writeFile(join(FRAMES, file), data, "base64"));
    frames.push({ file, t: metadata.timestamp - T0 });
  });
  const cam = {
    name,
    page,
    api: context.request,
    browser,
    mobile,
    size: [Math.round(viewport.width * scale), Math.round(viewport.height * scale)],
    pointer: { x: viewport.width * 0.62, y: viewport.height * 0.58 },
    // The screencast only sends a frame when the page repaints, so each frame lasts until the next one.
    // A take starts with a forced repaint and ends by holding its last frame, so a still page is covered too.
    async roll() {
      if (rolling) return;
      rolling = true;
      takes.push([clock(), null]);
      await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, everyNthFrame: 1 });
      await page
        .evaluate(() => {
          const dot = document.createElement("div");
          dot.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:.01;pointer-events:none";
          document.body.appendChild(dot);
          requestAnimationFrame(() => requestAnimationFrame(() => dot.remove()));
        })
        .catch(() => {});
      await sleep(150);
    },
    async cut() {
      if (!rolling) return;
      await cdp.send("Page.stopScreencast");
      rolling = false;
      const now = clock();
      takes.at(-1)[1] = now;
      const last = frames.at(-1);
      if (last) frames.push({ file: last.file, t: now });
    },
    async encode() {
      await cam.cut();
      await Promise.all(writes);
      if (frames.length === 0) return null;
      frames.sort((a, b) => a.t - b.t);
      const lines = ["ffconcat version 1.0"];
      frames.forEach((f, i) => {
        const next = i + 1 < frames.length ? frames[i + 1].t : f.t + 1 / FPS;
        lines.push(`file '${f.file}'`, `duration ${(next - f.t).toFixed(4)}`);
      });
      // The concat demuxer ignores the last entry's duration unless the file is listed again.
      lines.push(`file '${frames.at(-1).file}'`);
      const list = join(FRAMES, `${name}.ffconcat`);
      writeFileSync(list, lines.join("\n"));
      const mp4 = join(OUT, `${name}.mp4`);
      // A fractional scale can round a frame one pixel wider than the target, so every frame is cropped to it.
      const [w, h] = cam.size;
      const args = ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-vf", `crop=${w}:${h}:0:0`, "-fps_mode", "cfr", "-r", String(FPS)];
      args.push("-c:v", "libx264", "-preset", "medium", "-crf", "16", "-g", String(FPS), "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4);
      const run = spawnSync("ffmpeg", args, { stdio: "inherit" });
      if (run.status !== 0) throw new Error(`ffmpeg failed for ${name}`);
      const fixed = (n) => Number(n.toFixed(3));
      return { file: `${name}.mp4`, start: fixed(frames[0].t), size: cam.size, frames: frames.length, takes: takes.map(([a, b]) => [fixed(a), fixed(b)]) };
    },
  };
  return cam;
}

async function go(cam, path) {
  await cam.page.goto(BASE + path, { waitUntil: "networkidle" });
  await sleep(500);
}

const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);

async function moveTo(cam, x, y, ms = 700) {
  const from = cam.pointer;
  const steps = Math.max(10, Math.round(ms / 16));
  for (let i = 1; i <= steps; i++) {
    const p = ease(i / steps);
    await cam.page.mouse.move(from.x + (x - from.x) * p, from.y + (y - from.y) * p);
    await sleep(ms / steps);
  }
  cam.pointer = { x, y };
}

// Scrolls smoothly instead of letting Playwright jump, and only when the element sits near an edge.
// Plots pass larger margins because the Board's sticky header and seed pouch cover the edges.
const PLOT_VIEW = { top: 120, bottom: 300 };
// The seed pouch and the "Why?" box sit in a sticky tray that is always on screen, so they never scroll.
const TRAY_VIEW = { top: 0, bottom: 0 };
async function bringIntoView(locator, { top = 40, bottom = 40 } = {}) {
  const visible = await locator.evaluate((el, [top, bottom]) => {
    const r = el.getBoundingClientRect();
    return r.top >= top && r.bottom <= innerHeight - bottom;
  }, [top, bottom]);
  if (visible) return;
  await locator.evaluate((el) => el.scrollIntoView({ behavior: "smooth", block: "center" }));
  await sleep(1000);
}

async function center(locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error(`not visible: ${locator}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function clickOn(cam, locator, { ms = 700, hold = 150, view } = {}) {
  await locator.waitFor({ state: "visible" });
  await bringIntoView(locator, view);
  const { x, y } = await center(locator);
  await moveTo(cam, x, y, ms);
  await sleep(hold);
  await cam.page.mouse.down();
  await sleep(80);
  await cam.page.mouse.up();
}

async function tapOn(cam, locator, { hold = 500, view } = {}) {
  await locator.waitFor({ state: "visible" });
  await bringIntoView(locator, view);
  await sleep(hold);
  const { x, y } = await center(locator);
  await cam.page.touchscreen.tap(x, y);
}

// Native selects and sliders react to a real click (a popup, a jump), so the pointer only hovers before the value is set.
async function hoverOn(cam, locator, ms = 700) {
  await locator.waitFor({ state: "visible" });
  await bringIntoView(locator);
  const { x, y } = await center(locator);
  await moveTo(cam, x, y, ms);
}

async function typeInto(cam, locator, text, delay = 55, view) {
  await clickOn(cam, locator, { view });
  await locator.pressSequentially(text, { delay });
}

async function confirmDialog(cam, label) {
  const button = cam.page.getByRole("dialog").getByRole("button", { name: label, exact: true });
  if (cam.mobile) await tapOn(cam, button, { hold: 700 });
  else await clickOn(cam, button, { ms: 500 });
}

// Markers for things the class sees are placed when the projector shows them, not when the button was pressed.
const onProjector = (text) => projector.page.getByText(text).first().waitFor({ state: "visible", timeout: 20000 });

const visibleButton = (cam, text) => cam.page.locator("button:visible", { hasText: text }).first();

const REASONS = [
  [/^int\[\] scores/, "We need the scores before we can look for the biggest one."],
  [/^int max/, "Max starts as the first score, so there is something to compare with."],
  [/^for /, "The loop starts at 1 because the first score is already in max."],
  [/^if /, "We only replace max when this score is bigger."],
  [/^max = /, "Max changes only inside the if, when a score is bigger."],
  [/^System\.out/, "Print comes last, after every score has been checked."],
];
const reasonFor = (code) => REASONS.find(([re]) => re.test(code))?.[1] ?? "This step has to happen before the next one.";

const lecturer = await camera("lecturer", { loginId: "lecturer", viewport: { width: 1440, height: 810 }, scale: 4 / 3 });
const student = await camera("student", { loginId: "student", viewport: { width: 1440, height: 810 }, scale: 4 / 3 });
const projector = await camera("projector", { loginId: "lecturer", viewport: { width: 1600, height: 900 }, scale: 1.2, overlay: false });
const phone = await camera("phone", { loginId: "student", viewport: { width: 390, height: 844 }, scale: 2, mobile: true });
const remote = await camera("console", { loginId: "lecturer", viewport: { width: 390, height: 844 }, scale: 2, mobile: true });
const cameras = [lecturer, student, projector, phone, remote];

const teach = await (await lecturer.api.get(`${BASE}/api/teach`)).json();
const csc101 = teach.courses.find((c) => c.code === "CSC101");
if (csc101.live) await lecturer.api.post(`${BASE}/api/sessions/${csc101.live.sessionId}/control`, { data: { action: "close" } });
const detail = await (await lecturer.api.get(`${BASE}/api/courses/${csc101.id}`)).json();
const findMax = detail.exercises.find((e) => e.title === "FindMax");
const rows = (await (await lecturer.api.get(`${BASE}/api/exercises/${findMax.id}`)).json()).rows.map((r, position) => ({ ...r, position }));
const rightPlot = (code) => rows.find((r) => r.code.trim() === code && !r.given)?.position;
const plot = (cam, position) => cam.page.locator(`button[aria-label^='Plot ${position + 1},']`);
const seeds = (cam) => cam.page.locator("[aria-label='Your seeds'] button:not([disabled])");

// 1. The lecturer prepares an Exercise.
{
  const page = lecturer.page;
  await go(lecturer, `/teach/courses/${csc101.id}/exercises/new`);
  await lecturer.roll();
  mark("editor.start");
  await sleep(1500);
  await typeInto(lecturer, page.locator("input[placeholder=FindMax]"), "SumOfOdds", 80);
  await sleep(400);
  await clickOn(lecturer, page.locator("textarea"));
  await sleep(300);
  mark("editor.paste");
  await page.locator("textarea").fill(
    [
      "public class SumOfOdds {",
      "    public static void main(String[] args) {",
      "        int sum = 0;",
      "        for (int i = 1; i <= 9; i += 2) {",
      "            sum += i;",
      "        }",
      '        System.out.println("Sum: " + sum);',
      "    }",
      "}",
    ].join("\n"),
  );
  // Each beat holds longer than its narration needs, so the edit only ever cuts forward in time.
  await sleep(3500);
  await clickOn(lecturer, page.getByText("Split into rows"));
  mark("editor.split");
  await sleep(1800);
  const steps = ["Define the program SumOfOdds", "Start main", "Set sum to 0", "For each odd number i from 1 to 9"];
  const inputs = page.locator("input[aria-label^='Pseudocode step']");
  for (let i = 0; i < steps.length; i++) await typeInto(lecturer, inputs.nth(i), steps[i], 35);
  mark("editor.end");
  await sleep(2000);
  await lecturer.cut();
}

// 2. The lecturer sets up a Session and opens the Lobby.
let sid;
{
  const page = lecturer.page;
  await go(lecturer, `/teach/courses/${csc101.id}`);
  await lecturer.roll();
  mark("setup.start");
  await sleep(1200);
  await clickOn(lecturer, page.getByRole("tab", { name: "Run a Session" }));
  await sleep(1500);
  const exercise = page.getByLabel("Exercise for Round 1");
  await hoverOn(lecturer, exercise);
  await exercise.selectOption(findMax.id);
  await sleep(600);
  const minutes = page.getByLabel("Minutes for Round 1");
  await clickOn(lecturer, minutes);
  await minutes.fill("5");
  await sleep(600);
  const hand = page.locator("input[type=range]");
  await hoverOn(lecturer, hand);
  await hand.fill("3");
  mark("setup.configured");
  await sleep(1500);
  await clickOn(lecturer, page.getByRole("button", { name: "Open the Lobby", exact: true }));
  await sleep(1200);
  await confirmDialog(lecturer, "Open the Lobby");
  mark("setup.opened");
  await page.waitForURL(/\/console\//);
  sid = page.url().split("/console/")[1].split(/[?#]/)[0];
  await sleep(2500);
  await lecturer.cut();
  // The console moves the simulated students; only the phone console may do that from here on.
  await page.goto("about:blank");
}

// 3. Students arrive in the Lobby on the projector.
{
  await go(projector, `/projector/${sid}`);
  await projector.roll();
  mark("lobby.start");
  await sleep(2000);
  for (const count of [3, 5, 6, 7, 6, 7]) {
    await lecturer.api.post(`${BASE}/api/sessions/${sid}/bots`, { data: { count } });
    await sleep(1100);
  }
  await student.api.post(`${BASE}/api/sessions/${sid}/join`);
  await onProjector(/35 gardeners have arrived/);
  mark("lobby.full");
  await sleep(4000);
  await projector.cut();
}

// 4. The lecturer starts Round 1 from the phone console.
{
  await go(remote, `/console/${sid}`);
  await remote.roll();
  await projector.roll();
  mark("start.start");
  await sleep(2000);
  await tapOn(remote, visibleButton(remote, "Start Round 1"));
  mark("start.go");
  await sleep(4000);
  await remote.cut();
  await projector.cut();
  // Only the console moves the simulated students, so leaving it pauses the class while the Board is filmed.
  await remote.page.goto("about:blank");
}

// 5. A student plants on their own Board: a wrong plot wilts, the right one blooms, then "Why?".
{
  const page = student.page;
  await go(student, `/play/${sid}`);
  await student.roll();
  mark("board.start");
  await sleep(2500);
  // Glide down the signposts (left of each plot), then across to a plot.
  for (const p of [2, 4, 6]) {
    const box = await plot(student, p).boundingBox();
    await moveTo(student, box.x - 260, box.y + box.height / 2, 900);
    await sleep(700);
  }
  const { x: px, y: py } = await center(plot(student, 6));
  await moveTo(student, px, py, 900);
  await sleep(900);
  mark("board.pouch");
  const seed = seeds(student).first();
  const code = (await seed.innerText()).trim();
  const right = rightPlot(code);
  const wrong = rows.find((r) => !r.given && Math.abs(r.position - right) === 1)?.position ?? rows.find((r) => !r.given && r.position !== right).position;
  await sleep(1200);
  await clickOn(student, seed, { ms: 900, view: TRAY_VIEW });
  mark("board.seed");
  await sleep(3000);
  await clickOn(student, plot(student, wrong), { ms: 900, view: PLOT_VIEW });
  mark("board.wilt");
  await sleep(5000);
  await clickOn(student, plot(student, right), { ms: 900, view: PLOT_VIEW });
  mark("board.bloom");
  await sleep(6500);
  mark("board.why");
  await typeInto(student, page.locator("input[placeholder^='Why plot']"), reasonFor(code), 40, TRAY_VIEW);
  await sleep(600);
  await clickOn(student, page.getByRole("button", { name: "Save", exact: true }), { view: TRAY_VIEW });
  mark("board.saved");
  await sleep(2500);
  await student.cut();
}

// 6. The class plays on: the phone plants a seed with a reason while the projector's Class Board fills.
let reason;
{
  await go(phone, `/play/${sid}`);
  await go(remote, `/console/${sid}`);
  await phone.roll();
  await projector.roll();
  mark("class.start");
  await sleep(6000);
  const seed = seeds(phone).first();
  const code = (await seed.innerText()).trim();
  reason = reasonFor(code);
  await tapOn(phone, seed, { view: TRAY_VIEW });
  await tapOn(phone, plot(phone, rightPlot(code)), { hold: 900, view: PLOT_VIEW });
  mark("class.planted");
  await sleep(1500);
  mark("class.why");
  const why = phone.page.locator("input[placeholder^='Why plot']");
  await tapOn(phone, why, { hold: 300, view: TRAY_VIEW });
  await why.pressSequentially(reason, { delay: 40 });
  await sleep(500);
  await tapOn(phone, phone.page.getByRole("button", { name: "Save", exact: true }), { hold: 300, view: TRAY_VIEW });
  mark("class.reasoned");
  await sleep(9000);
  mark("class.end");
  await phone.cut();
  // The console lists only the latest 60 Placements, so the class stops here to keep the reason in that list.
  // Off camera, and the phone's sticky control bar covers the checkbox, so it's clicked from inside the page.
  const keepPlaying = remote.page.locator("label:visible", { hasText: "They keep playing" }).locator("input");
  if (await keepPlaying.isChecked()) await keepPlaying.evaluate((el) => el.click());
  await remote.page.evaluate(() => window.scrollTo({ top: 0 }));
  await sleep(1000);
}

// 7. The lecturer spotlights the student's reason on the projector, reveals the solution and closes.
{
  await remote.roll();
  mark("spotlight.start");
  await sleep(4500);
  const mine = remote.page.locator("li", { hasText: reason }).first();
  const item = (await mine.count()) ? mine : remote.page.locator("li", { has: remote.page.getByRole("button", { name: "Spotlight", exact: true }) }).first();
  if (item !== mine) console.log("the student's reason has left the console list; spotlighting the newest reason instead");
  await bringIntoView(item, { top: 80, bottom: 120 });
  await tapOn(remote, item.getByRole("button", { name: "Spotlight", exact: true }));
  await confirmDialog(remote, "Pin on the projector");
  await onProjector("Pinned by your lecturer");
  mark("spotlight.pinned");
  await sleep(6000);

  const last = seeds(phone).first();
  if (await last.isVisible().catch(() => false)) {
    const code = (await last.innerText()).trim();
    await tapOn(phone, last, { hold: 200, view: TRAY_VIEW });
    await tapOn(phone, plot(phone, rightPlot(code)), { hold: 200, view: PLOT_VIEW });
  }
  await remote.page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await sleep(1200);
  await tapOn(remote, visibleButton(remote, /^Reveal/));
  await confirmDialog(remote, "Reveal solution");
  await onProjector("The full solution");
  mark("reveal.done");
  await sleep(6000);
  await tapOn(remote, visibleButton(remote, "Close Session"));
  await confirmDialog(remote, "Close Session");
  await onProjector("Harvest Festival");
  mark("finale");
  await sleep(5000);
  await remote.cut();
  await projector.cut();
}

// 8. After class: the lecturer's dashboard, then the student's profile.
{
  const page = lecturer.page;
  await go(lecturer, `/teach/courses/${csc101.id}`);
  await lecturer.roll();
  mark("dashboard.start");
  await sleep(1200);
  await clickOn(lecturer, page.getByRole("tab", { name: "Dashboard" }));
  await sleep(2000);
  mark("dashboard.shown");
  const bars = page.getByText(/put it at step/);
  for (let i = 0; i < 3; i++) {
    await bringIntoView(bars.nth(i), { top: 80, bottom: 80 });
    const { x, y } = await center(bars.nth(i));
    await moveTo(lecturer, x, y - 20, 900);
    await sleep(1600);
  }
  mark("dashboard.end");
  await sleep(1500);
  await lecturer.cut();

  await go(student, "/profile");
  await student.roll();
  mark("profile.start");
  await sleep(2500);
  for (let i = 0; i < 2; i++) {
    await student.page.evaluate(() => window.scrollBy({ top: 420, behavior: "smooth" }));
    await sleep(2800);
  }
  mark("profile.end");
  await student.cut();
}

const streams = {};
for (const cam of cameras) {
  const result = await cam.encode();
  if (result) streams[cam.name] = result;
  await cam.browser.close();
  console.log("encoded", cam.name, result?.frames ?? 0, "frames");
}
rmSync(FRAMES, { recursive: true, force: true });
writeFileSync(join(OUT, "markers.json"), JSON.stringify({ fps: FPS, sessionId: sid, streams, marks }, null, 2));
console.log("done", OUT);
