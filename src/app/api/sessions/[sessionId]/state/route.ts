import { requireViewer } from "@/server/auth";
import { handle } from "@/server/http";
import { studentState } from "@/server/services/sessions";

type Ctx = { params: Promise<{ sessionId: string }> };

export const GET = handle(async (_req, { params }: Ctx) => studentState(await requireViewer("student"), (await params).sessionId));
