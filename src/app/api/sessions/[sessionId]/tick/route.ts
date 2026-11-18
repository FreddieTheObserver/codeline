import { requireViewer } from "@/server/auth";
import { handle } from "@/server/http";
import { tickSession } from "@/server/services/sessions";

type Ctx = { params: Promise<{ sessionId: string }> };

export const POST = handle(async (req, { params }: Ctx) => {
  const viewer = await requireViewer("lecturer", "ta");
  const bots = new URL(req.url).searchParams.get("bots") !== "0";
  return tickSession(viewer, (await params).sessionId, bots);
});
