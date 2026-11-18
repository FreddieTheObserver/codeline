/* eslint-disable @typescript-eslint/no-explicit-any -- a throwaway HTTP driver, typed loosely on purpose */
// Opens a live demo Session in CSC101 with simulated classmates and starts Round 1.
// Usage: BASE_URL=http://localhost:3210 bun scripts/demo-live.ts [--mode teams] [--ticks 12] [--no-start]
const BASE = process.env.BASE_URL ?? "http://localhost:3210";
const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
};

async function call(cookie: string, method: string, path: string, body?: unknown) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${text}`);
  return { data: text ? JSON.parse(text) : null, cookie: res.headers.get("set-cookie")?.split(";")[0] ?? cookie };
}

async function signIn(loginId: string) {
  const { cookie } = await call("", "POST", "/api/auth/signin", { loginId, password: "codeline-demo" });
  return cookie;
}

async function main() {
  const lecturer = await signIn("lecturer");
  const { data: teach } = await call(lecturer, "GET", "/api/teach");
  const course = teach.courses.find((c: any) => c.code === "CSC101");
  if (course.live) await call(lecturer, "POST", `/api/sessions/${course.live.sessionId}/control`, { action: "close" });
  const { data: detail } = await call(lecturer, "GET", `/api/courses/${course.id}`);
  const ex = (title: string) => detail.exercises.find((e: any) => e.title === title).id;
  const mode = arg("mode", "solo");
  const { data: created } = await call(lecturer, "POST", "/api/sessions", {
    courseId: course.id,
    mode,
    handSize: 3,
    teamCount: 4,
    rounds: [
      { exerciseId: ex("FindMax"), timeLimitS: 300 },
      { exerciseId: ex("SumOfEvens"), timeLimitS: 240 },
    ],
  });
  const sessionId = created.id;
  await call(lecturer, "POST", `/api/sessions/${sessionId}/bots`, { count: Number(arg("bots", "28")) });
  const student = await signIn("student");
  await call(student, "POST", `/api/sessions/${sessionId}/join`);
  if (!process.argv.includes("--no-start")) {
    await call(lecturer, "POST", `/api/sessions/${sessionId}/control`, { action: "start" });
    const ticks = Number(arg("ticks", "12"));
    for (let i = 0; i < ticks; i++) {
      await call(lecturer, "POST", `/api/sessions/${sessionId}/tick`);
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  console.log(sessionId);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

export {};
