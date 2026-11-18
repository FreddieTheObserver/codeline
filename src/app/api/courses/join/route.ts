import { z } from "zod";
import { requireViewer } from "@/server/auth";
import { handle, readJson } from "@/server/http";
import { joinCourse } from "@/server/services/courses";

const input = z.object({ code: z.string().trim().min(4, "Enter the join code from the projector.").max(12) });

export const POST = handle(async (req) => {
  const viewer = await requireViewer("student");
  const { code } = await readJson(req, input);
  return joinCourse(viewer, code);
});
