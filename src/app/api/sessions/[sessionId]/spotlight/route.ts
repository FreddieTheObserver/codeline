import { z } from "zod";
import { requireViewer } from "@/server/auth";
import { handle, readJson } from "@/server/http";
import { spotlightPlacement } from "@/server/services/sessions";

type Ctx = { params: Promise<{ sessionId: string }> };
const input = z.object({ placementId: z.string().uuid() });

export const POST = handle(async (req, { params }: Ctx) => {
  const viewer = await requireViewer("lecturer", "ta");
  const { placementId } = await readJson(req, input);
  await spotlightPlacement(viewer, (await params).sessionId, placementId);
  return { ok: true };
});
