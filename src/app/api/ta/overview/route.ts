import { requireViewer } from "@/server/auth";
import { handle } from "@/server/http";
import { taOverview } from "@/server/services/dashboard";

export const GET = handle(async () => taOverview(await requireViewer("ta")));
