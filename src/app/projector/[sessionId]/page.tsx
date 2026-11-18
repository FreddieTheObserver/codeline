import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/ui";
import { Projector } from "./Projector";

export const metadata: Metadata = { title: "Projector" };

export default function ProjectorPage({ params }: PageProps<"/projector/[sessionId]">) {
  return (
    <Suspense fallback={<Loading />}>
      {params.then(({ sessionId }) => (
        <Projector sessionId={sessionId} />
      ))}
    </Suspense>
  );
}
