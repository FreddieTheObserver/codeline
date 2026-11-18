"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ButtonLink, ErrorNote, Loading, Panel } from "@/components/ui";
import { api, errorText, post } from "@/lib/client";
import type { CourseCard, Viewer } from "@/lib/api-types";

// The projector's QR code lands here: sign up or in, enrol with the code, then go straight to the live Session.
export function JoinByCode({ code }: { code: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        const { viewer } = await api<{ viewer: Viewer | null }>("/api/me");
        if (!viewer) {
          router.replace(`/signup?next=${encodeURIComponent(`/join/${code}`)}`);
          return;
        }
        if (viewer.role !== "student") {
          setError("Join codes are for student accounts. Sign in as a student to join.");
          return;
        }
        const course = await post<CourseCard>("/api/courses/join", { code });
        router.replace(course.live ? `/play/${course.live.sessionId}` : "/home");
      } catch (err) {
        setError(errorText(err));
      }
    })();
  }, [code, router]);

  if (!error) return <Loading label="Opening the gate..." />;
  return (
    <main className="mx-auto w-full max-w-md p-4">
      <Panel>
        <ErrorNote>{error}</ErrorNote>
        <ButtonLink href="/home" tone="secondary">
          Go to your valley
        </ButtonLink>
      </Panel>
    </main>
  );
}
