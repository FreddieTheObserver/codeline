// Browser checks for flows the API smoke test can't see: confirm dialogs, unsaved-changes guards,
// sign-in and sign-out, and pages that Next.js keeps alive while hidden and restores on return.
// Usage: node scripts/ui-check.mjs [baseUrl]. Run it against a local, seeded database: it creates a course and an Exercise.
// Hidden pages stay in the DOM, so CSS selectors here are limited to :visible elements.
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3210";
const PASSWORD = "codeline-demo";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const failures = [];
function check(label, ok, detail = "") {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${!ok && detail ? ` (${detail})` : ""}`);
  if (!ok) failures.push(label);
}

const browser = await chromium.launch({ channel: "msedge" });

async function signedIn(loginId) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const res = await context.request.post(`${BASE}/api/auth/signin`, { data: { loginId, password: PASSWORD } });
  if (!res.ok()) throw new Error(`sign-in failed for ${loginId}: ${res.status()}`);
  const page = await context.newPage();
  page.on("pageerror", (e) => check(`no page errors (${loginId})`, false, e.message));
  return { page, api: context.request };
}

const lecturer = await signedIn("lecturer");
const { page, api } = lecturer;
const dialog = () => page.getByRole("dialog");
const breadcrumb = (name) => page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name, exact: true });

const teach = await (await api.get(`${BASE}/api/teach`)).json();
const csc = teach.courses.find((c) => c.code === "CSC101");
if (csc.live) await api.post(`${BASE}/api/sessions/${csc.live.sessionId}/control`, { data: { action: "close" } });
const liveNow = async () => (await (await api.get(`${BASE}/api/courses/${csc.id}`)).json()).course.live;

// Opening the Lobby asks first, and a cancelled question changes nothing.
await page.goto(`${BASE}/teach/courses/${csc.id}?tab=run`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Open the Lobby" }).click();
await dialog().getByRole("button", { name: "Cancel" }).click();
check("cancelling Open the Lobby creates no Session", (await liveNow()) === null);

// Open, close, and come back: the setup must be usable again without a reload.
await page.getByRole("button", { name: "Open the Lobby" }).click();
await dialog().getByRole("button", { name: "Open the Lobby" }).click();
await page.waitForURL(/\/console\//);
await page.waitForLoadState("networkidle");
await page.getByRole("button", { name: "Close Session" }).click();
check("Close Session starts on Cancel", await page.evaluate(() => document.activeElement?.textContent === "Cancel"));
await dialog().getByRole("button", { name: "Close Session" }).click();
await wait(1200);
await breadcrumb("CSC101").click();
await page.getByRole("tab", { name: "Run a Session" }).click();
const openLobby = page.getByRole("button", { name: "Open the Lobby" });
// Within a few seconds, not after the page's own 10-second refresh: returning must refetch.
const ready = await openLobby.waitFor({ timeout: 3000 }).then(() => true, () => false);
check("Open the Lobby works again after closing a Session", ready && (await openLobby.isEnabled()));

// Creating a course, then going back, must not reopen a stuck dialog.
await page.goto(`${BASE}/teach`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "New course" }).click();
check("New course dialog opens", await dialog().isVisible());
await page.keyboard.press("Escape");
check("Escape closes the dialog", (await dialog().count()) === 0);
await page.getByRole("button", { name: "New course" }).click();
await page.fill("input[placeholder=CSC102]:visible", "UI101");
await page.fill("input[placeholder='Data Structures']:visible", "UI check course");
await dialog().getByRole("button", { name: "Create course" }).click();
await page.waitForURL(/\/teach\/courses\//);
await breadcrumb("My courses").click();
await wait(800);
check("no dialog waiting on My courses after creating a course", (await dialog().count()) === 0);

// A new Exercise, once created, must not come back as the next "New Exercise" draft.
await page.goto(`${BASE}/teach/courses/${csc.id}`, { waitUntil: "networkidle" });
await page.getByRole("link", { name: "New Exercise" }).first().click();
await page.waitForURL(/\/exercises\/new$/);
await page.fill("input[placeholder=FindMax]:visible", "UI check Exercise");
await page.fill("textarea:visible", "int x = 1;\nSystem.out.println(x);");
await page.getByRole("button", { name: "Split into rows" }).click();
const signposts = page.locator("input[aria-label^='Pseudocode step']:visible");
await signposts.nth(0).fill("Set x to 1");
await signposts.nth(1).fill("Print x");
await page.getByRole("button", { name: "Create Exercise" }).click();
await page.waitForURL(/\/teach\/exercises\/[^/]+$/);
await page.waitForLoadState("networkidle");

// Unsaved changes ask before leaving.
await page.fill("input[placeholder=FindMax]:visible", "UI check Exercise, edited");
await breadcrumb("CSC101").click();
check("leaving with unsaved changes asks first", await dialog().isVisible());
await dialog().getByRole("button", { name: "Keep editing" }).click();
check("Keep editing stays on the editor", page.url().includes("/teach/exercises/"));
await dialog().waitFor({ state: "detached" });
await breadcrumb("CSC101").click();
await dialog().getByRole("button", { name: "Leave without saving" }).click();
await page.waitForURL(/\/teach\/courses\/[^/]+$/);
await page.getByRole("link", { name: "New Exercise" }).first().click();
await page.waitForURL(/\/exercises\/new$/);
await wait(500);
check("New Exercise starts blank after creating one", (await page.inputValue("input[placeholder=FindMax]:visible")) === "");

// The course tab survives a trip to a student's page and back.
const dash = await (await api.get(`${BASE}/api/courses/${csc.id}/dashboard`)).json();
await page.goto(`${BASE}/teach/courses/${csc.id}/students/${dash.students[0].userId}`, { waitUntil: "networkidle" });
await breadcrumb("Dashboard").click();
await page.waitForLoadState("networkidle");
check("breadcrumb returns to the Dashboard tab", (await page.getByRole("tab", { name: "Dashboard" }).getAttribute("aria-selected")) === "true");

// Signing out with unsaved changes asks first, in the page, before the account is signed out.
const exercises = (await (await api.get(`${BASE}/api/courses/${csc.id}`)).json()).exercises;
await page.goto(`${BASE}/teach/exercises/${exercises[0].id}`, { waitUntil: "networkidle" });
// Typed with the keyboard: browsers only show their own "Leave site?" prompt after real user input.
await page.locator("input[placeholder=FindMax]:visible").click();
await page.keyboard.type(" (unsaved)");
const nativePrompts = [];
page.on("dialog", (d) => {
  nativePrompts.push(d.type());
  void d.dismiss();
});
const lecturerHeader = page.locator("header").first();
await lecturerHeader.getByRole("button", { name: "Sign out" }).click();
check("sign-out with unsaved changes asks first", await dialog().isVisible());
await dialog().getByRole("button", { name: "Keep editing" }).click();
await wait(500);
check("Keep editing keeps the lecturer signed in", (await lecturerHeader.getByText("Demo Lecturer").count()) === 1 && page.url().includes("/teach/exercises/"));
await lecturerHeader.getByRole("button", { name: "Sign out" }).click();
await dialog().getByRole("button", { name: "Sign out without saving" }).click();
await page.waitForURL(`${BASE}/`, { timeout: 10000 }).catch(() => {});
await wait(1000);
check("no browser prompt gets in the way of signing out", nativePrompts.length === 0, nativePrompts.join(", "));
check("signing out without saving lands on the landing page", new URL(page.url()).pathname === "/", page.url());

// Sign in through the form, sign out from the header.
const guest = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const header = () => guest.locator("header").first();
await guest.goto(`${BASE}/`, { waitUntil: "networkidle" });
await guest.goto(`${BASE}/signin`, { waitUntil: "networkidle" });
await guest.fill("input[autocomplete=username]:visible", "student");
await guest.fill("input[type=password]:visible", PASSWORD);
await guest.getByRole("button", { name: "Sign in" }).click();
await guest.waitForURL(/\/home$/);
await guest.waitForLoadState("networkidle");
check("header shows the signed-in student", (await header().getByText("Demo Student").count()) === 1);
check("header offers no Sign in once signed in", (await header().getByRole("link", { name: "Sign in" }).count()) === 0);
check("welcome message shown", (await guest.getByText("Welcome back, Comet.").count()) === 1);
await header().getByRole("button", { name: "Sign out" }).click();
await guest.waitForURL(`${BASE}/`);
await guest.waitForLoadState("networkidle");
await wait(1500);
check("sign-out lands on the landing page", new URL(guest.url()).pathname === "/", guest.url());
check("landing offers sign-up after sign-out", (await guest.getByRole("link", { name: "Create an account" }).count()) >= 1);
check("landing no longer offers Continue as", (await guest.getByText(/Continue as/).count()) === 0);
check("signed-out message shown", (await guest.getByText(/You signed out/).count()) === 1);
await guest.getByRole("link", { name: "Sign in" }).first().click();
await guest.waitForURL(/\/signin/);
await wait(500);
check("sign-in form is empty for the next person", (await guest.inputValue("input[type=password]:visible")) === "" && (await guest.inputValue("input[autocomplete=username]:visible")) === "");
check("sign-in button is ready", await guest.locator("form button[type=submit]:visible").isEnabled());

await browser.close();
if (failures.length) {
  console.log(`\n${failures.length} UI check(s) failed.`);
  process.exit(1);
}
console.log("\nUI checks passed.");
