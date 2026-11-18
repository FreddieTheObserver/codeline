import { requireViewer } from "@/server/auth";
import { handle } from "@/server/http";
import { courseDashboard } from "@/server/services/dashboard";

type Ctx = { params: Promise<{ courseId: string }> };

export const GET = handle(async (_req, { params }: Ctx) => {
  const viewer = await requireViewer("lecturer", "ta");
  return courseDashboard(viewer, (await params).courseId);
});
