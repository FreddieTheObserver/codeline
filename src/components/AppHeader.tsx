"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { errorText, post, useApi } from "@/lib/client";
import { hasUnsavedChanges, setLeaving } from "@/lib/leaving";
import type { Viewer } from "@/lib/api-types";
import { flashToast, useConfirm, useToast } from "./feedback";
import { homeFor, isActive, navFor, roleLabel, type NavLink } from "./nav";
import { Sprite } from "./pixel/Sprite";
import { BLOOM } from "./pixel/sprites";
import { Button, ButtonLink, cx } from "./ui";

function NavLinks({ links, pathname }: { links: NavLink[]; pathname: string | null }) {
  return (
    <ul className="flex flex-wrap items-center gap-1 font-pixel text-parchment">
      {links.map((l) => {
        const active = isActive(l, pathname);
        return (
          <li key={l.href}>
            <Link
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={cx(
                "block px-2 py-1 no-underline hover:bg-[rgb(0_0_0/0.12)]",
                active && "bg-[rgb(0_0_0/0.18)] shadow-[inset_0_-3px_0_0_var(--color-sun)]",
              )}
            >
              {l.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// usePathname suspends on dynamic routes while prerendering, so only this part waits for it.
function ActiveNav({ links }: { links: NavLink[] }) {
  return <NavLinks links={links} pathname={usePathname()} />;
}

export function AppHeader() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data } = useApi<{ viewer: Viewer | null }>("/api/me");
  const viewer = data?.viewer ?? null;
  const links = navFor(viewer);

  async function signOut() {
    if (hasUnsavedChanges()) {
      const ok = await confirm({
        title: "Sign out without saving?",
        body: "This page has changes that aren't saved yet.",
        confirmLabel: "Sign out without saving",
        cancelLabel: "Keep editing",
        tone: "danger",
      });
      if (!ok) return;
    }
    setLeaving(true);
    try {
      await post("/api/auth/signout");
    } catch (err) {
      setLeaving(false);
      toast(`Couldn't sign out: ${errorText(err)}`, "error");
      return;
    }
    flashToast("You signed out. See you in the next Session.");
    // A full page load, not a client navigation: Next.js keeps recently visited pages alive but hidden,
    // and on a shared classroom computer none of them, nor any cached data, may outlive the sign-out.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/");
  }

  return (
    <header className="px-panel px-panel-wood flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 sm:px-4">
      <Link href={viewer ? homeFor(viewer.role) : "/"} className="flex items-center gap-2 no-underline" aria-label="CodeLine home">
        <Sprite grid={BLOOM} scale={3} />
        <span className="font-pixel text-2xl text-parchment">CodeLine</span>
      </Link>
      <nav aria-label="Main" className="order-3 w-full sm:order-2 sm:w-auto sm:flex-1">
        <Suspense fallback={<NavLinks links={links} pathname={null} />}>
          <ActiveNav links={links} />
        </Suspense>
      </nav>
      <div className="order-2 ml-auto flex items-center gap-2 text-parchment sm:order-3 sm:ml-0">
        {viewer ? (
          <>
            <span className="hidden text-right leading-tight md:block">
              <span className="block text-sm font-bold">{viewer.name}</span>
              <span className="block text-xs opacity-85">{roleLabel(viewer)}</span>
            </span>
            <Button tone="secondary" className="!px-3 !py-1 text-sm" onClick={signOut}>
              Sign out
            </Button>
          </>
        ) : data ? (
          <>
            <ButtonLink href="/signin" tone="secondary" className="!px-3 !py-1 text-sm">
              Sign in
            </ButtonLink>
            <ButtonLink href="/signup" className="!px-3 !py-1 text-sm">
              Create account
            </ButtonLink>
          </>
        ) : null}
      </div>
    </header>
  );
}
