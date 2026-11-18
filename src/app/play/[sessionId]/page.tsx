import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/ui";
import { Play } from "./Play";

export const metadata: Metadata = { title: "In the garden" };

export default function PlayPage({ params }: PageProps<"/play/[sessionId]">) {
  return (
    <Suspense fallback={<Loading />}>
      {params.then(({ sessionId }) => (
        <Play sessionId={sessionId} />
      ))}
    </Suspense>
  );
}
