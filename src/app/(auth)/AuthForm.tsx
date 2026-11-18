"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ErrorNote, Field, Panel, Title } from "@/components/ui";
import { ValleyScene } from "@/components/ValleyScene";
import { errorText, post } from "@/lib/client";
import type { Viewer } from "@/lib/api-types";

function destination(viewer: Viewer): string {
  const next = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("next") : null;
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return viewer.role === "student" ? "/home" : viewer.role === "ta" ? "/ta" : "/teach";
}

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const viewer =
        mode === "signup"
          ? await post<Viewer>("/api/auth/signup", { loginId, name, password })
          : await post<Viewer>("/api/auth/signin", { loginId, password });
      router.push(destination(viewer));
      router.refresh();
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col">
      <ValleyScene compact>
        <div className="mx-auto w-full max-w-md px-3 pb-10 pt-10">
          <Panel>
            <Link href="/" className="font-pixel text-sm underline">
              CodeLine
            </Link>
            <Title className="mt-1">{mode === "signup" ? "Join the valley" : "Welcome back"}</Title>
            <p className="mb-4 mt-1 text-sm">
              {mode === "signup"
                ? "Create your account with your student ID, then enter your course's join code."
                : "Sign in with your student ID or staff username."}
            </p>
            <form onSubmit={submit} className="flex flex-col gap-3">
              <Field label={mode === "signup" ? "Student ID" : "Student ID or username"}>
                <input
                  className="px-input"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  autoComplete="username"
                  inputMode={mode === "signup" ? "numeric" : undefined}
                  required
                />
              </Field>
              {mode === "signup" && (
                <Field label="Your name" hint="Only your lecturer sees your real name. Classmates see your nickname.">
                  <input className="px-input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
                </Field>
              )}
              <Field label="Password" hint={mode === "signup" ? "At least 8 characters." : undefined}>
                <input
                  className="px-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  minLength={mode === "signup" ? 8 : undefined}
                  required
                />
              </Field>
              <ErrorNote>{error}</ErrorNote>
              <Button type="submit" disabled={busy}>
                {busy ? "One moment..." : mode === "signup" ? "Create account" : "Sign in"}
              </Button>
            </form>
            <p className="mt-4 text-sm">
              {mode === "signup" ? (
                <>
                  Already have an account?{" "}
                  <Link href="/signin" className="font-bold underline">
                    Sign in
                  </Link>
                </>
              ) : (
                <>
                  New here?{" "}
                  <Link href="/signup" className="font-bold underline">
                    Create an account
                  </Link>
                </>
              )}
            </p>
          </Panel>
        </div>
      </ValleyScene>
    </main>
  );
}
