"use client";

import { useEffect, useRef, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  client ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

// Listens for the content-free "something changed" push for one Session.
// Returns whether the push channel is live, so callers can poll less often.
export function useSessionPush(sessionId: string, onPush: () => void): boolean {
  const [live, setLive] = useState(false);
  const handler = useRef(onPush);
  useEffect(() => {
    handler.current = onPush;
  }, [onPush]);
  useEffect(() => {
    const supabase = getClient();
    if (!supabase) return;
    const channel = supabase
      .channel(`session-${sessionId}`)
      .on("broadcast", { event: "control" }, () => handler.current())
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    return () => {
      setLive(false);
      void supabase.removeChannel(channel);
    };
  }, [sessionId]);
  return live;
}
