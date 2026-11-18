import { requireViewer } from "@/server/auth";
import { handle } from "@/server/http";
import { projectorState } from "@/server/services/sessions";

type Ctx = { params: Promise<{ sessionId: string }> };

export const GET = handle(async (_req, { params }: Ctx) => projectorState(await requireViewer("lecturer", "ta"), (await params).sessionId));
