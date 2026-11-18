import "server-only";
import { after } from "next/server";

export type ControlPush = { sessionId: string; version: number };

// Content-free on purpose: the channel is public, so it carries no names or answers.
// Students refetch their own state when a push arrives.
export function pushControl(push: ControlPush): void {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return;
  after(async () => {
    try {
      await fetch(`${url}/realtime/v1/api/broadcast`, {
        method: "POST",
        headers: { apikey: key, "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ topic: `session-${push.sessionId}`, event: "control", payload: { v: push.version }, private: false }],
        }),
        signal: AbortSignal.timeout(3000),
      });
    } catch (err) {
      console.warn("Realtime push failed; students will poll instead.", err);
    }
  });
}
