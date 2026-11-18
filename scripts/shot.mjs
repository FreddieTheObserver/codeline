import { chromium } from "playwright";
const [, , url, out, w = "1280", h = "900", login = ""] = process.argv;
const browser = await chromium.launch({ channel: "msedge" });
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const base = new URL(url).origin;
if (login) {
  const [id, pw] = login.split(":");
  const r = await page.request.post(base + "/api/auth/signin", { data: { loginId: id, password: pw } });
  if (!r.ok()) throw new Error("login failed " + r.status());
}
page.on("console", (m) => { if (m.type() === "error") console.log("console:", m.text()); });
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log("saved", out);
