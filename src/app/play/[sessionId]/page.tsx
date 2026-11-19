import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { Loading } from "@/components/ui";
import { Play } from "./Play";

export const metadata: Metadata = { title: "In the garden" };

export default function PlayPage({ params }: PageProps<"/play/[sessionId]">) {
  return (
    <Suspense fallback={<PageShell><Loading /></PageShell>}>
      {params.then(({ sessionId }) => (
        <Play sessionId={sessionId} />
      ))}
    </Suspense>
  );
}
