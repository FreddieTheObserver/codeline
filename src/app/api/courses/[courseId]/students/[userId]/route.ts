import { requireViewer } from "@/server/auth";
import { handle } from "@/server/http";
import { studentDetail } from "@/server/services/dashboard";

type Ctx = { params: Promise<{ courseId: string; userId: string }> };

export const GET = handle(async (_req, { params }: Ctx) => {
  const viewer = await requireViewer("lecturer", "ta");
  const { courseId, userId } = await params;
  return studentDetail(viewer, courseId, userId);
});
