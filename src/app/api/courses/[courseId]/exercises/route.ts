import { requireViewer } from "@/server/auth";
import { handle, readJson } from "@/server/http";
import { createExercise, exerciseInput } from "@/server/services/exercises";

type Ctx = { params: Promise<{ courseId: string }> };

export const POST = handle(async (req, { params }: Ctx) => {
  const viewer = await requireViewer("lecturer");
  const id = await createExercise(viewer, (await params).courseId, await readJson(req, exerciseInput));
  return { id };
});
