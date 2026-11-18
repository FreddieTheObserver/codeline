import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { users } from "../db/schema";
import { conflict, HttpError } from "../http";
import { hashPassword, startLoginSession, verifyPassword } from "../auth";
import type { Viewer } from "@/lib/api-types";

export const signUpInput = z.object({
  loginId: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9._-]{3,30}$/, "Use your student ID: 3 to 30 letters or digits."),
  name: z.string().trim().min(1, "Tell us your name.").max(60),
  password: z.string().min(8, "Use at least 8 characters for your password.").max(200),
});

export const signInInput = z.object({
  loginId: z.string().trim().min(1, "Enter your student ID."),
  password: z.string().min(1, "Enter your password."),
});

const toViewer = (u: typeof users.$inferSelect): Viewer => ({
  id: u.id,
  loginId: u.loginId,
  name: u.name,
  nickname: u.nickname,
  role: u.role,
});

export async function signUp(input: z.infer<typeof signUpInput>): Promise<Viewer> {
  const loginId = input.loginId.toLowerCase();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.loginId, loginId));
  if (existing) throw conflict("That student ID already has an account. Sign in instead.");
  const [user] = await db
    .insert(users)
    .values({
      loginId,
      name: input.name,
      nickname: input.name.split(/\s+/)[0].slice(0, 20),
      role: "student",
      passwordHash: await hashPassword(input.password),
    })
    .returning();
  await startLoginSession(user.id);
  return toViewer(user);
}

export async function signIn(input: z.infer<typeof signInInput>): Promise<Viewer> {
  const [user] = await db.select().from(users).where(eq(users.loginId, input.loginId.toLowerCase()));
  const ok = user && !user.isSimulated && (await verifyPassword(input.password, user.passwordHash));
  if (!ok) throw new HttpError(401, "That ID and password don't match.");
  await startLoginSession(user.id);
  return toViewer(user);
}
