import { requireViewer } from "@/server/auth";
import { handle } from "@/server/http";
import { courseDetail } from "@/server/services/courses";

type Ctx = { params: Promise<{ courseId: string }> };

export const GET = handle(async (_req, { params }: Ctx) => {
  const viewer = await requireViewer("lecturer", "ta");
  return courseDetail(viewer, (await params).courseId);
});
