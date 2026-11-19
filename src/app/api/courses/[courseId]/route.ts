import { requireViewer } from "@/server/auth";
import { handle } from "@/server/http";
import { courseDetail, deleteCourse } from "@/server/services/courses";

type Ctx = { params: Promise<{ courseId: string }> };

export const GET = handle(async (_req, { params }: Ctx) => {
  const viewer = await requireViewer("lecturer", "ta");
  return courseDetail(viewer, (await params).courseId);
});

export const DELETE = handle(async (_req, { params }: Ctx) => {
  const viewer = await requireViewer("lecturer");
  await deleteCourse(viewer, (await params).courseId);
  return { ok: true };
});
