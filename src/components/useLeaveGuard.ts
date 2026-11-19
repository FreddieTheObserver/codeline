"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useConfirm } from "./feedback";

// While there are unsaved changes, asks before a reload, a tab close, or a click on any in-app link.
export function useLeaveGuard(dirty: boolean, what: string) {
  const confirm = useConfirm();
  const router = useRouter();

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    // Capture phase, so this runs before next/link's own click handler.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      e.preventDefault();
      e.stopPropagation();
      void confirm({
        title: "Leave without saving?",
        body: `Your changes to ${what} aren't saved yet. If you leave now, they're lost.`,
        confirmLabel: "Leave without saving",
        cancelLabel: "Keep editing",
        tone: "danger",
      }).then((ok) => {
        if (ok) router.push(`${url.pathname}${url.search}${url.hash}`);
      });
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty, what, confirm, router]);
}
