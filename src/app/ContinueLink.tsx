"use client";

import { ButtonLink } from "@/components/ui";
import { useApi } from "@/lib/client";
import type { Viewer } from "@/lib/api-types";

export function ContinueLink() {
  const { data } = useApi<{ viewer: Viewer | null }>("/api/me");
  const viewer = data?.viewer;
  if (!viewer) return null;
  const href = viewer.role === "student" ? "/home" : viewer.role === "ta" ? "/ta" : "/teach";
  return (
    <ButtonLink href={href} tone="sun">
      Continue as {viewer.nickname}
    </ButtonLink>
  );
}
