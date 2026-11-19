import { requireViewer } from "@/server/auth";
import { handle } from "@/server/http";
import { sessionReport } from "@/server/services/sessions";

type Ctx = { params: Promise<{ courseId: string; sessionId: string }> };

export const GET = handle(async (_req, { params }: Ctx) => {
  const viewer = await requireViewer("lecturer", "ta");
  const { courseId, sessionId } = await params;
  return sessionReport(viewer, courseId, sessionId);
});
