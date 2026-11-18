"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { post, useApi } from "@/lib/client";
import type { Viewer } from "@/lib/api-types";
import { Sprite } from "./pixel/Sprite";
import { BLOOM } from "./pixel/sprites";

export function AppHeader({ links = [] }: { links?: { href: string; label: string }[] }) {
  const router = useRouter();
  const { data } = useApi<{ viewer: Viewer | null }>("/api/me");
  const viewer = data?.viewer;
  const home = viewer?.role === "student" ? "/home" : viewer?.role === "ta" ? "/ta" : "/teach";
  const roleLinks =
    viewer?.role === "student"
      ? [{ href: "/home", label: "Valley" }, { href: "/profile", label: "Profile" }]
      : viewer?.role === "ta"
        ? [{ href: "/ta", label: "Overview" }, { href: "/teach", label: "My courses" }]
        : viewer?.role === "lecturer"
          ? [{ href: "/teach", label: "My courses" }]
          : [];

  async function signOut() {
    await post("/api/auth/signout");
    router.push("/");
    router.refresh();
  }

  return (
    <header className="px-panel-wood px-panel mx-auto mt-3 flex w-[calc(100%-24px)] max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
      <Link href={viewer ? home : "/"} className="flex items-center gap-2 no-underline" aria-label="CodeLine home">
        <Sprite grid={BLOOM} scale={3} />
        <span className="font-pixel text-2xl text-parchment">CodeLine</span>
      </Link>
      <nav className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1 font-pixel text-parchment" aria-label="Main">
        {[...roleLinks, ...links].map((l) => (
          <Link key={l.href} href={l.href} className="underline-offset-4 hover:underline">
            {l.label}
          </Link>
        ))}
      </nav>
      {viewer && (
        <div className="flex items-center gap-3 text-sm text-parchment">
          <span>
            <span className="font-bold">{viewer.name}</span>
            <span className="opacity-80"> · {viewer.role === "ta" ? "Teaching assistant" : viewer.role === "lecturer" ? "Lecturer" : viewer.loginId}</span>
          </span>
          <button onClick={signOut} className="px-btn px-btn-secondary !px-3 !py-1 text-sm">
            Sign out
          </button>
        </div>
      )}
    </header>
  );
}

export function PageShell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <>
      <AppHeader />
      <main className={`mx-auto w-full ${wide ? "max-w-7xl" : "max-w-6xl"} flex-1 px-3 py-6`}>{children}</main>
    </>
  );
}
