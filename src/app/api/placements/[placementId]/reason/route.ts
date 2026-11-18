import { z } from "zod";
import { requireViewer } from "@/server/auth";
import { handle, readJson } from "@/server/http";
import { giveReason } from "@/server/services/sessions";

type Ctx = { params: Promise<{ placementId: string }> };
const input = z.object({ reason: z.string().max(200) });

export const POST = handle(async (req, { params }: Ctx) => {
  const viewer = await requireViewer("student");
  const { reason } = await readJson(req, input);
  return { badges: await giveReason(viewer, (await params).placementId, reason) };
});
