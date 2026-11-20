"use client";

import { useState } from "react";
import { errorText, post } from "@/lib/client";
import { hasUnsavedChanges, setLeaving } from "@/lib/leaving";
import { flashToast, useConfirm, useToast } from "./feedback";

export function useSignOut() {
  const toast = useToast();
  const confirm = useConfirm();
  const [signingOut, setSigningOut] = useState(false);

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
    setSigningOut(true);
    try {
      await post("/api/auth/signout");
    } catch (err) {
      setLeaving(false);
      setSigningOut(false);
      toast(`Couldn't sign out: ${errorText(err)}`, "error");
      return;
    }
    flashToast("You signed out. See you in the next Session.");
    // A full page load, not a client navigation: Next.js keeps recently visited pages alive but hidden,
    // and on a shared classroom computer none of them, nor any cached data, may outlive the sign-out.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/");
  }

  return { signOut, signingOut };
}
