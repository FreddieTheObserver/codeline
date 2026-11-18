import "server-only";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { almanac, badges, courses, exercises, users } from "../db/schema";
import { badRequest } from "../http";
import { BADGES } from "@/domain/badges";
import { levelProgress, unlockedCosmetics } from "@/domain/levels";
import type { ProfileDto, Viewer } from "@/lib/api-types";

export const profileInput = z.object({
  nickname: z.string().trim().min(1, "Pick a nickname.").max(20, "Keep the nickname to 20 characters."),
  avatar: z.object({
    hat: z.string().max(30).optional(),
    tool: z.string().max(30).optional(),
    pet: z.string().max(30).optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  }),
});

export async function getProfile(viewer: Viewer): Promise<ProfileDto> {
  const [me] = await db.select().from(users).where(eq(users.id, viewer.id));
  const progress = levelProgress(me.xp);
  const earned = await db.select().from(badges).where(eq(badges.userId, viewer.id));
  const earnedAt = new Map(earned.map((b) => [b.badge, b.earnedAt.toISOString()]));
  const entries = await db
    .select({
      exerciseId: almanac.exerciseId,
      title: exercises.title,
      language: exercises.language,
      courseCode: courses.code,
      bestPoints: almanac.bestPoints,
      firstAt: almanac.firstAt,
    })
    .from(almanac)
    .innerJoin(exercises, eq(exercises.id, almanac.exerciseId))
    .innerJoin(courses, eq(courses.id, exercises.courseId))
    .where(eq(almanac.userId, viewer.id))
    .orderBy(desc(almanac.firstAt));
  return {
    viewer: { ...viewer, nickname: me.nickname },
    level: { level: progress.level, xp: me.xp, into: progress.into, span: progress.span },
    avatar: me.avatar,
    unlocked: unlockedCosmetics(progress.level),
    badges: BADGES.map((b) => ({ id: b.id, name: b.name, description: b.description, icon: b.icon, earnedAt: earnedAt.get(b.id) ?? null })),
    almanac: entries.map((e) => ({ ...e, firstAt: e.firstAt.toISOString() })),
  };
}

export async function updateProfile(viewer: Viewer, input: z.infer<typeof profileInput>): Promise<void> {
  const [me] = await db.select().from(users).where(eq(users.id, viewer.id));
  const unlocked = new Set(unlockedCosmetics(levelProgress(me.xp).level).map((c) => c.id));
  for (const item of [input.avatar.hat, input.avatar.tool, input.avatar.pet]) {
    if (item && !unlocked.has(item)) throw badRequest("That item unlocks at a higher Level.");
  }
  await db.update(users).set({ nickname: input.nickname, avatar: input.avatar }).where(eq(users.id, viewer.id));
}
