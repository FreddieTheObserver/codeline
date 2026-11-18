import { z } from "zod";
import { requireViewer } from "@/server/auth";
import { handle, readJson } from "@/server/http";
import { addSimulatedStudents } from "@/server/services/sessions";

type Ctx = { params: Promise<{ sessionId: string }> };
const input = z.object({ count: z.number().int().min(1).max(60) });

export const POST = handle(async (req, { params }: Ctx) => {
  const viewer = await requireViewer("lecturer", "ta");
  const { count } = await readJson(req, input);
  return { added: await addSimulatedStudents(viewer, (await params).sessionId, count) };
});
