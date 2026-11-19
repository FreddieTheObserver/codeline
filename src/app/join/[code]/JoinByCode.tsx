"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/feedback";
import { homeFor } from "@/components/nav";
import { PageShell } from "@/components/PageShell";
import { ErrorState, Loading } from "@/components/ui";
import { api, errorText, post } from "@/lib/client";
import type { CourseCard, Viewer } from "@/lib/api-types";

// The projector's QR code lands here: sign up or in, enrol with the code, then go straight to the live Session.
export function JoinByCode({ code }: { code: string }) {
  const router = useRouter();
  const toast = useToast();
  const [failure, setFailure] = useState<{ message: string; home: string } | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      let home = "/home";
      try {
        const { viewer } = await api<{ viewer: Viewer | null }>("/api/me");
        if (!viewer) {
          router.replace(`/signup?next=${encodeURIComponent(`/join/${code}`)}`);
          return;
        }
        home = homeFor(viewer.role);
        if (viewer.role !== "student") {
          setFailure({ message: "Join codes are for student accounts. Sign in as a student to join.", home });
          return;
        }
        const course = await post<CourseCard>("/api/courses/join", { code });
        toast(`You're in ${course.code} · ${course.title}.`);
        router.replace(course.live ? `/play/${course.live.sessionId}` : "/home");
      } catch (err) {
        setFailure({ message: errorText(err), home });
      }
    })();
  }, [code, router, toast]);

  return (
    <PageShell>
      {failure ? (
        <ErrorState message={failure.message} backHref={failure.home} backLabel={failure.home === "/home" ? "Go to your valley" : "Go to my courses"} />
      ) : (
        <Loading label="Opening the gate..." />
      )}
    </PageShell>
  );
}
