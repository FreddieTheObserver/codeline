import { requireViewer } from "@/server/auth";
import { handle } from "@/server/http";
import { studentHome } from "@/server/services/courses";

export const GET = handle(async () => studentHome(await requireViewer("student")));
