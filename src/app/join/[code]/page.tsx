import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { Loading } from "@/components/ui";
import { JoinByCode } from "./JoinByCode";

export const metadata: Metadata = { title: "Join a course" };

export default function JoinPage({ params }: PageProps<"/join/[code]">) {
  return (
    <Suspense fallback={<PageShell><Loading label="Opening the gate..." /></PageShell>}>
      {params.then(({ code }) => (
        <JoinByCode code={code} />
      ))}
    </Suspense>
  );
}
