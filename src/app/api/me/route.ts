import { getViewer } from "@/server/auth";
import { handle } from "@/server/http";

export const GET = handle(async () => ({ viewer: await getViewer() }));
