import { requireViewer } from "@/server/auth";
import { handle } from "@/server/http";
import { duplicateExercise } from "@/server/services/exercises";

type Ctx = { params: Promise<{ exerciseId: string }> };

export const POST = handle(async (_req, { params }: Ctx) => {
  const viewer = await requireViewer("lecturer");
  return { id: await duplicateExercise(viewer, (await params).exerciseId) };
});
