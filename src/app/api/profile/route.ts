import { requireViewer } from "@/server/auth";
import { handle, readJson } from "@/server/http";
import { getProfile, profileInput, updateProfile } from "@/server/services/profile";

export const GET = handle(async () => getProfile(await requireViewer("student")));

export const PATCH = handle(async (req) => {
  const viewer = await requireViewer("student");
  await updateProfile(viewer, await readJson(req, profileInput));
  return { ok: true };
});
