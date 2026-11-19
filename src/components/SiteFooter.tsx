"use client";

import Link from "next/link";
import { useApi } from "@/lib/client";
import type { Viewer } from "@/lib/api-types";
import { homeFor, navFor } from "./nav";
import { Sprite } from "./pixel/Sprite";
import { BLOOM, SPROUT } from "./pixel/sprites";

export function SiteFooter() {
  const { data } = useApi<{ viewer: Viewer | null }>("/api/me");
  const viewer = data?.viewer ?? null;
  const links = viewer
    ? navFor(viewer).map(({ href, label }) => ({ href, label: href === "/home" ? "Your valley" : label }))
    : [
        { href: "/", label: "Home" },
        { href: "/signin", label: "Sign in" },
        { href: "/signup", label: "Create an account" },
      ];

  return (
    <footer className="mt-10 bg-soil-dark text-parchment" style={{ boxShadow: "inset 0 6px 0 0 var(--color-grass-dark)" }}>
      <div className="page-container grid gap-6 pb-6 pt-9 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.5fr)]">
        <div>
          <Link href={viewer ? homeFor(viewer.role) : "/"} className="inline-flex items-center gap-2 no-underline">
            <Sprite grid={BLOOM} scale={3} />
            <span className="font-pixel text-xl">CodeLine</span>
          </Link>
          <p className="mt-2 max-w-xs text-sm opacity-90">Turn plain-words algorithms into code, one seed at a time.</p>
        </div>
        <nav aria-label="Footer">
          <p className="font-pixel">Explore</p>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {[...links, { href: "/about", label: "About CodeLine" }].map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="underline-offset-4 hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <p className="font-pixel">A classroom prototype</p>
          <p className="mt-2 text-sm opacity-90">
            The courses, past Sessions and most students are sample data, marked &ldquo;Sample data&rdquo; or &ldquo;simulated&rdquo; wherever they appear.
          </p>
        </div>
      </div>
      <div className="border-t-2 border-[rgb(0_0_0/0.25)]">
        <div className="page-container flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-3 text-xs opacity-85">
          <span className="flex items-center gap-2">
            <Sprite grid={SPROUT} scale={1} /> CodeLine
          </span>
          <span>Pixel art and sounds made for CodeLine. Fonts under the SIL Open Font License.</span>
        </div>
      </div>
    </footer>
  );
}
