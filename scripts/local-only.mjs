// The checks and the screen capture create courses, Sessions and simulated students, so they stop unless
// the server is on this machine: pointed at the live site, that data would sit in front of real users.
export function requireLocalServer(base) {
  const host = new URL(base).hostname;
  const local = host === "localhost" || host === "[::1]" || /^127\.\d+\.\d+\.\d+$/.test(host);
  if (local || process.argv.includes("--allow-remote")) return;
  console.error(`Refusing to run against ${base}: this script creates data, so it only runs against a local server.`);
  console.error("Pass --allow-remote as the last argument if you really mean to.");
  process.exit(1);
}
