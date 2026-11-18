import { z } from "zod";
import { requireViewer } from "@/server/auth";
import { handle, readJson } from "@/server/http";
import { placeCard } from "@/server/services/sessions";

type Ctx = { params: Promise<{ sessionId: string }> };
const input = z.object({ cardId: z.string().uuid(), slotId: z.string().uuid() });

export const POST = handle(async (req, { params }: Ctx) => {
  const viewer = await requireViewer("student");
  const { cardId, slotId } = await readJson(req, input);
  return placeCard(viewer, (await params).sessionId, cardId, slotId);
});
