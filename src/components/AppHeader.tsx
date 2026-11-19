"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense } from "react";
import { mutate } from "swr";
import { post, useApi } from "@/lib/client";
import type { Viewer } from "@/lib/api-types";
import { useToast } from "./feedback";
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
  const router = useRouter();
  const toast = useToast();
  const { data } = useApi<{ viewer: Viewer | null }>("/api/me");
  const viewer = data?.viewer ?? null;
  const links = navFor(viewer);

  async function signOut() {
    await post("/api/auth/signout");
    // Drop every cached response, so the next person on this device never sees the last one's data.
    await mutate(() => true, undefined, { revalidate: false });
    await mutate("/api/me", { viewer: null }, { revalidate: false });
    toast("You signed out. See you in the next Session.");
    router.push("/");
    router.refresh();
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
