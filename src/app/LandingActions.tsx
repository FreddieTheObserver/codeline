"use client";

import { Button, ButtonLink } from "@/components/ui";
import { homeFor } from "@/components/nav";
import { useSignOut } from "@/components/useSignOut";
import { useApi } from "@/lib/client";
import type { Viewer } from "@/lib/api-types";

// Signed-in visitors get a way forward instead of sign-up and sign-in buttons they don't need,
// and a way out, since the next student at a shared computer lands here too.
export function LandingActions() {
  const { data } = useApi<{ viewer: Viewer | null }>("/api/me");
  const { signOut, signingOut } = useSignOut();
  const viewer = data?.viewer;
  if (viewer) {
    return (
      <>
        <ButtonLink href={homeFor(viewer.role)} tone="sun" className="text-lg">
          Continue as {viewer.nickname}
        </ButtonLink>
        <Button tone="secondary" busy={signingOut} onClick={signOut}>
          {signingOut ? "Signing out" : "Not you? Sign out"}
        </Button>
      </>
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
