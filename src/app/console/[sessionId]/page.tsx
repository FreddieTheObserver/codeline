import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading } from "@/components/ui";
import { Console } from "./Console";

export const metadata: Metadata = { title: "Lecturer console" };

export default function ConsolePage({ params }: PageProps<"/console/[sessionId]">) {
  return (
    <Suspense fallback={<Loading />}>
      {params.then(({ sessionId }) => (
        <Console sessionId={sessionId} />
      ))}
    </Suspense>
  );
}
