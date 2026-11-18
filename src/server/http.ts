import "server-only";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const badRequest = (m: string) => new HttpError(400, m);
export const unauthorized = () => new HttpError(401, "Please sign in first.");
export const forbidden = (m = "You don't have access to this.") => new HttpError(403, m);
export const notFound = (m = "Not found.") => new HttpError(404, m);
export const conflict = (m: string) => new HttpError(409, m);

export function handle<C>(fn: (req: Request, ctx: C) => Promise<unknown>) {
  return async (req: Request, ctx: C): Promise<Response> => {
    try {
      const result = await fn(req, ctx);
      if (result instanceof Response) return result;
      return Response.json(result ?? { ok: true });
    } catch (err) {
      // Next signals "this route is dynamic" by throwing during prerendering; let it through.
      unstable_rethrow(err);
      if (err instanceof HttpError) return Response.json({ error: err.message }, { status: err.status });
      if (err instanceof z.ZodError) {
        return Response.json({ error: err.issues[0]?.message ?? "Invalid input." }, { status: 400 });
      }
      console.error(err);
      return Response.json({ error: "Something went wrong on our side." }, { status: 500 });
    }
  };
}

export async function readJson<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw badRequest("Expected a JSON body.");
  }
  return schema.parse(raw);
}
