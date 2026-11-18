import { z } from "zod";
import { requireViewer } from "@/server/auth";
import { handle, readJson } from "@/server/http";
import { createCourse, staffCourses } from "@/server/services/courses";

export const GET = handle(async () => {
  const viewer = await requireViewer("lecturer", "ta");
  return { viewer, courses: await staffCourses(viewer) };
});

const input = z.object({
  code: z.string().trim().min(2, "Enter a course code such as CSC101.").max(12),
  title: z.string().trim().min(2, "Enter the course title.").max(80),
  language: z.string().trim().min(1).max(20),
});

export const POST = handle(async (req) => {
  const viewer = await requireViewer("lecturer");
  const course = await createCourse(viewer, await readJson(req, input));
  return { id: course.id };
});
