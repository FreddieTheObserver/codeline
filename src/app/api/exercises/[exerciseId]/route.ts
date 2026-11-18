import { requireViewer } from "@/server/auth";
import { handle, readJson } from "@/server/http";
import { deleteExercise, exerciseInput, getExercise, updateExercise } from "@/server/services/exercises";

type Ctx = { params: Promise<{ exerciseId: string }> };

export const GET = handle(async (_req, { params }: Ctx) => {
  const viewer = await requireViewer("lecturer", "ta");
  return getExercise(viewer, (await params).exerciseId);
});

export const PUT = handle(async (req, { params }: Ctx) => {
  const viewer = await requireViewer("lecturer");
  await updateExercise(viewer, (await params).exerciseId, await readJson(req, exerciseInput));
  return { ok: true };
});

export const DELETE = handle(async (_req, { params }: Ctx) => {
  const viewer = await requireViewer("lecturer");
  await deleteExercise(viewer, (await params).exerciseId);
  return { ok: true };
});
