import "server-only";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "./db/client";
import { loginSessions, users } from "./db/schema";
import { forbidden, unauthorized } from "./http";
import type { Role, Viewer } from "@/lib/api-types";

export { hashPassword, verifyPassword } from "./password";

const COOKIE = "cl_auth";
const LIFETIME_DAYS = 14;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function startLoginSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + LIFETIME_DAYS * 86_400_000);
  await db.insert(loginSessions).values({ userId, tokenHash: sha256(token), expiresAt });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function endLoginSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.delete(loginSessions).where(eq(loginSessions.tokenHash, sha256(token)));
  jar.delete(COOKIE);
}

export async function getViewer(): Promise<Viewer | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [row] = await db
    .select({ id: users.id, loginId: users.loginId, name: users.name, nickname: users.nickname, role: users.role })
    .from(loginSessions)
    .innerJoin(users, eq(users.id, loginSessions.userId))
    .where(and(eq(loginSessions.tokenHash, sha256(token)), gt(loginSessions.expiresAt, new Date())))
    .limit(1);
  return row ?? null;
}

export async function requireViewer(...roles: Role[]): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) throw unauthorized();
  if (roles.length && !roles.includes(viewer.role)) throw forbidden();
  return viewer;
}

export const AUTH_COOKIE = COOKIE;
