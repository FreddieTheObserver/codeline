import type { ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { SiteFooter } from "./SiteFooter";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-sun focus:px-3 focus:py-2 focus:font-pixel focus:text-ink"
      >
        Skip to content
      </a>
      <div className="page-container pt-3">
        <AppHeader />
      </div>
      <main id="main" tabIndex={-1} className="page-container flex-1 py-6 focus:outline-none">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
