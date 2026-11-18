import { z } from "zod";
import { requireViewer } from "@/server/auth";
import { handle, readJson } from "@/server/http";
import { controlSession } from "@/server/services/sessions";

type Ctx = { params: Promise<{ sessionId: string }> };
const input = z.object({ action: z.enum(["start", "pause", "resume", "end", "reveal", "next", "close"]) });

export const POST = handle(async (req, { params }: Ctx) => {
  const viewer = await requireViewer("lecturer", "ta");
  const { action } = await readJson(req, input);
  await controlSession(viewer, (await params).sessionId, action);
  return { ok: true };
});
