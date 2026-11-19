import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { Loading } from "@/components/ui";
import { Console } from "./Console";

export const metadata: Metadata = { title: "Lecturer console" };

export default function ConsolePage({ params }: PageProps<"/console/[sessionId]">) {
  return (
    <Suspense fallback={<PageShell><Loading /></PageShell>}>
      {params.then(({ sessionId }) => (
        <Console sessionId={sessionId} />
      ))}
    </Suspense>
  );
}
