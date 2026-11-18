import { requireViewer } from "@/server/auth";
import { handle, readJson } from "@/server/http";
import { createSession, createSessionInput } from "@/server/services/sessions";

export const POST = handle(async (req) => {
  const viewer = await requireViewer("lecturer", "ta");
  return { id: await createSession(viewer, await readJson(req, createSessionInput)) };
});
