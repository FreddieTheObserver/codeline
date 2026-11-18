import { requireViewer } from "@/server/auth";
import { handle } from "@/server/http";
import { joinSession } from "@/server/services/sessions";

type Ctx = { params: Promise<{ sessionId: string }> };

export const POST = handle(async (_req, { params }: Ctx) => {
  await joinSession(await requireViewer("student"), (await params).sessionId);
  return { ok: true };
});
