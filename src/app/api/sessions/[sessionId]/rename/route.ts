import { z } from "zod";
import { requireViewer } from "@/server/auth";
import { handle, readJson } from "@/server/http";
import { renameParticipant } from "@/server/services/sessions";

type Ctx = { params: Promise<{ sessionId: string }> };
const input = z.object({ userId: z.string().uuid(), nickname: z.string().trim().min(1).max(20) });

export const POST = handle(async (req, { params }: Ctx) => {
  const viewer = await requireViewer("lecturer", "ta");
  const { userId, nickname } = await readJson(req, input);
  await renameParticipant(viewer, (await params).sessionId, userId, nickname);
  return { ok: true };
});
