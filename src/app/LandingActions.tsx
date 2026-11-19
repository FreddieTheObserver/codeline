"use client";

import { ButtonLink } from "@/components/ui";
import { homeFor } from "@/components/nav";
import { useApi } from "@/lib/client";
import type { Viewer } from "@/lib/api-types";

// Signed-in visitors get one way forward instead of sign-up and sign-in buttons they don't need.
export function LandingActions() {
  const { data } = useApi<{ viewer: Viewer | null }>("/api/me");
  const viewer = data?.viewer;
  if (viewer) {
    return (
      <ButtonLink href={homeFor(viewer.role)} tone="sun" className="text-lg">
        Continue as {viewer.nickname}
      </ButtonLink>
    );
  }
  return (
    <>
      <ButtonLink href="/signup">Create an account</ButtonLink>
      <ButtonLink href="/signin" tone="secondary">
        Sign in
      </ButtonLink>
    </>
  );
}
