/* eslint-disable @typescript-eslint/no-explicit-any -- a throwaway HTTP probe, typed loosely on purpose */
// End-to-end smoke test of the live loop against a running server.
// Usage: BASE_URL=http://localhost:3210 bun scripts/smoke.ts
const BASE = process.env.BASE_URL ?? "http://localhost:3210";

class Client {
  cookie = "";
  constructor(public label: string) {}
  async call<T = any>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(BASE + path, {
      method,
      headers: { "Content-Type": "application/json", ...(this.cookie ? { cookie: this.cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: "manual",
    });
    const set = res.headers.get("set-cookie");
    if (set) this.cookie = set.split(";")[0];
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) throw new Error(`${this.label} ${method} ${path} -> ${res.status} ${text}`);
    return data as T;
  }
}

function check(cond: unknown, msg: string) {
  if (!cond) throw new Error("FAILED: " + msg);
  console.log("ok  " + msg);
}

async function waitForServer() {
  for (let i = 0; i < 90; i++) {
    try {
      const res = await fetch(BASE + "/api/me");
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("Server did not start");
}

async function main() {
  await waitForServer();
  const lecturer = new Client("lecturer");
  await lecturer.call("POST", "/api/auth/signin", { loginId: "lecturer", password: "codeline-demo" });
  const teach = await lecturer.call("GET", "/api/teach");
  const course = teach.courses.find((c: any) => c.code === "CSC101");
  check(course?.canRun, "lecturer can run CSC101");
  if (course.live) await lecturer.call("POST", `/api/sessions/${course.live.sessionId}/control`, { action: "close" });
  const detail = await lecturer.call("GET", `/api/courses/${course.id}`);
  const findMax = detail.exercises.find((e: any) => e.title === "FindMax");
  check(findMax?.dealable === 6, "FindMax has 6 dealable Snippets");

  const { id: sessionId } = await lecturer.call("POST", "/api/sessions", {
    courseId: course.id,
    mode: "teams",
    handSize: 3,
    teamCount: 3,
    rounds: [{ exerciseId: findMax.id, timeLimitS: 120 }],
  });
  check(sessionId, "Session created");
  const bots = await lecturer.call("POST", `/api/sessions/${sessionId}/bots`, { count: 12 });
  check(bots.added === 12, "12 simulated students joined");

  const student = new Client("student");
  const sid = `smoke${Date.now() % 1e8}`;
  await student.call("POST", "/api/auth/signup", { loginId: sid, name: "Smoke Tester", password: "smoke-pass-123" });
  const joined = await student.call("POST", "/api/courses/join", { code: "meadow" });
  check(joined.live?.sessionId === sessionId, "join code enrols and shows the live Session");
  await student.call("POST", `/api/sessions/${sessionId}/join`);
  let state = await student.call("GET", `/api/sessions/${sessionId}/state`);
  check(state.me.joined && state.round === null, "student is in the Lobby");

  await lecturer.call("POST", `/api/sessions/${sessionId}/control`, { action: "start" });
  state = await student.call("GET", `/api/sessions/${sessionId}/state`);
  check(state.round?.timer.status === "running", "Round is running for the student");
  check(state.round.hand.length === 3, "student was dealt a Hand of 3");
  check(state.round.slots.filter((s: any) => !s.given && s.code !== null).length === 0, "no answers leak to the student");
  check(state.me.team !== null, "student is on a Team");

  // Two taps on the same card at once must score only once.
  const exercise = await lecturer.call("GET", `/api/exercises/${findMax.id}`);
  const firstCard = state.round.hand[0];
  const target = exercise.rows.find((r: any) => !r.given && r.code === firstCard.code);
  const taps = await Promise.allSettled([
    student.call("POST", `/api/sessions/${sessionId}/place`, { cardId: firstCard.cardId, slotId: target.id }),
    student.call("POST", `/api/sessions/${sessionId}/place`, { cardId: firstCard.cardId, slotId: target.id }),
  ]);
  const scored = taps.filter((t) => t.status === "fulfilled" && (t.value as any).correct);
  const afterTap = await student.call("GET", `/api/sessions/${sessionId}/state`);
  check(scored.length === 1 && afterTap.me.points === (scored[0] as any).value.points, "a double tap scores only once");

  let wrong = 0;
  for (const card of state.round.hand.slice(1)) {
    for (const slot of state.round.slots.filter((s: any) => !s.given)) {
      try {
        const r = await student.call("POST", `/api/sessions/${sessionId}/place`, { cardId: card.cardId, slotId: slot.id });
        if (r.correct) {
          if (wrong === 0) await student.call("POST", `/api/placements/${r.placementId}/reason`, { reason: "It matches the signpost." });
          break;
        }
        wrong++;
      } catch (e) {
        if (!String(e).includes("409")) throw e;
      }
    }
  }
  state = await student.call("GET", `/api/sessions/${sessionId}/state`);
  check(state.round.hand.every((c: any) => c.placedSlotId), "student planted their whole Hand");
  check(state.me.points > 0, `student scored ${state.me.points} points after ${wrong} wrong tries`);

  for (let i = 0; i < 5; i++) await lecturer.call("POST", `/api/sessions/${sessionId}/tick`);
  const projector = await lecturer.call("GET", `/api/sessions/${sessionId}/projector`);
  check(projector.progress.placed > 3, `projector shows class progress ${projector.progress.placed}/${projector.progress.dealt}`);
  check(projector.round.slots.filter((s: any) => !s.given && s.code !== null).length === 0, "projector hides code before the reveal");
  check(projector.teams.length === 3, "projector shows 3 Teams");
  const consoleView = await lecturer.call("GET", `/api/sessions/${sessionId}/console`);
  const withReason = consoleView.placements.find((p: any) => p.reason);
  check(consoleView.participants.length === 13 && withReason, "console lists everyone and their reasons");
  await lecturer.call("POST", `/api/sessions/${sessionId}/spotlight`, { placementId: withReason.id });

  await lecturer.call("POST", `/api/sessions/${sessionId}/control`, { action: "pause" });
  state = await student.call("GET", `/api/sessions/${sessionId}/state`);
  check(state.round.timer.status === "paused", "pause reaches the student");
  await lecturer.call("POST", `/api/sessions/${sessionId}/control`, { action: "resume" });
  await lecturer.call("POST", `/api/sessions/${sessionId}/control`, { action: "reveal" });
  state = await student.call("GET", `/api/sessions/${sessionId}/state`);
  check(state.round.revealed && state.round.slots.every((s: any) => s.code !== null), "reveal shows the full solution");
  check(state.result?.harvested && state.result.badges.some((b: any) => b.id === "first-harvest"), "student harvested and got First Harvest");
  const after = await lecturer.call("GET", `/api/sessions/${sessionId}/projector`);
  check(after.spotlight?.reason, "spotlighted reason shows on the projector");

  await lecturer.call("POST", `/api/sessions/${sessionId}/control`, { action: "close" });
  const dash = await lecturer.call("GET", `/api/courses/${course.id}/dashboard`);
  check(dash.students.length > 40 && dash.exercises.length === 3, "dashboard has students and hardest steps");
  const ta = new Client("ta");
  await ta.call("POST", "/api/auth/signin", { loginId: "ta", password: "codeline-demo" });
  const overview = await ta.call("GET", "/api/ta/overview");
  check(overview.courses.length >= 2, "TA overview lists every Course");
  console.log("\nSmoke test passed.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

export {};
