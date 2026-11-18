"use client";

import Link from "next/link";
import { useState } from "react";
import { PageShell } from "@/components/AppHeader";
import { Avatar } from "@/components/pixel/Avatar";
import { Sprite } from "@/components/pixel/Sprite";
import { BLOOM, FENCE, SIGN, SPROUT, STAR, TREE } from "@/components/pixel/sprites";
import { Button, ButtonLink, ErrorNote, Heading, LanguageTag, Loading, Meter, Panel, SampleTag } from "@/components/ui";
import { errorText, post, useApi } from "@/lib/client";
import type { CourseCard, StudentHome as Home } from "@/lib/api-types";

export function StudentHome() {
  const { data, error, mutate } = useApi<Home>("/api/home", { refreshInterval: 8000 });
  const [code, setCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setJoining(true);
    setJoinError("");
    try {
      await post<CourseCard>("/api/courses/join", { code });
      setCode("");
      await mutate();
    } catch (err) {
      setJoinError(errorText(err));
    } finally {
      setJoining(false);
    }
  }

  if (error) return <PageShell><ErrorNote>{error.message}</ErrorNote></PageShell>;
  if (!data) return <PageShell><Loading /></PageShell>;
  const live = data.courses.filter((c) => c.live);

  return (
    <PageShell>
      <div className="grid gap-4 md:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          {live.map((c) => (
            <Panel key={c.id} className="flex flex-wrap items-center gap-4 !bg-[#fff3c4]">
              <span className="anim-bob">
                <Sprite grid={SPROUT} scale={5} />
              </span>
              <div className="flex-1">
                <p className="font-pixel text-sm uppercase">Live now</p>
                <p className="font-pixel text-2xl">
                  {c.code} · {c.title}
                </p>
                <p className="text-sm">{c.live?.status === "lobby" ? "The gate is open. Come in and wait for the first Round." : "A Round is growing right now."}</p>
              </div>
              <ButtonLink href={`/play/${c.live!.sessionId}`} tone="sun" className="text-lg">
                Join the garden
              </ButtonLink>
            </Panel>
          ))}

          <Panel>
            <Heading>Your valley</Heading>
            {data.courses.length === 0 ? (
              <div className="mt-3 flex items-center gap-4">
                <Sprite grid={SIGN} scale={4} />
                <p>You aren&apos;t in any course yet. Enter the join code your lecturer shows on the projector.</p>
              </div>
            ) : (
              <ul className="mt-3 grid gap-4 sm:grid-cols-2">
                {data.courses.map((c) => (
                  <li key={c.id}>
                    <CourseField course={c} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel>
            <Heading>Open a new gate</Heading>
            <form onSubmit={join} className="mt-2 flex flex-wrap items-end gap-2">
              <label className="min-w-[200px] flex-1">
                <span className="mb-1 block text-sm font-bold">Course join code</span>
                <input
                  className="px-input font-mono uppercase tracking-[0.3em]"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="MEADOW"
                  maxLength={12}
                  required
                />
              </label>
              <Button type="submit" disabled={joining}>
                {joining ? "Opening..." : "Join course"}
              </Button>
            </form>
            <ErrorNote>{joinError}</ErrorNote>
          </Panel>
        </div>

        <aside className="flex flex-col gap-4">
          <Panel className="flex flex-col items-center text-center">
            <Avatar avatar={data.avatar} scale={6} label={`${data.viewer.nickname}'s avatar`} />
            <p className="mt-2 font-pixel text-2xl">{data.viewer.nickname}</p>
            <p className="text-sm">Level {data.level.level} gardener</p>
            <div className="mt-3 w-full">
              <Meter value={data.level.into} max={data.level.span} color="#f6c445" label="XP to next Level" />
              <p className="mt-1 text-xs">
                {data.level.into.toLocaleString()} / {data.level.span.toLocaleString()} XP to Level {data.level.level + 1}
              </p>
            </div>
            <div className="mt-4 grid w-full grid-cols-2 gap-2 text-sm">
              <div className="px-panel !m-1 p-2">
                <Sprite grid={STAR} scale={3} />
                <p className="font-pixel text-xl">{data.badgeCount}</p>
                <p>Badges</p>
              </div>
              <div className="px-panel !m-1 p-2">
                <Sprite grid={BLOOM} scale={3} />
                <p className="font-pixel text-xl">{data.almanacCount}</p>
                <p>Almanac crops</p>
              </div>
            </div>
            <ButtonLink href="/profile" tone="secondary" className="mt-3 w-[calc(100%-8px)]">
              Profile and almanac
            </ButtonLink>
          </Panel>
        </aside>
      </div>
    </PageShell>
  );
}

function CourseField({ course }: { course: CourseCard }) {
  return (
    <div className="relative overflow-hidden bg-grass-light p-3" style={{ boxShadow: "0 0 0 4px #4f8f3a" }}>
      <div className="absolute -right-2 bottom-0 opacity-90">
        <Sprite grid={TREE} scale={4} />
      </div>
      <div className="relative">
        <div className="flex flex-wrap items-center gap-2">
          <LanguageTag language={course.language} />
          {course.isSample && <SampleTag />}
        </div>
        <p className="mt-2 font-pixel text-2xl">{course.code}</p>
        <p className="max-w-[75%] text-sm font-bold">{course.title}</p>
        <div className="mt-2 flex">
          {Array.from({ length: 3 }, (_, i) => (
            <Sprite key={i} grid={FENCE} scale={3} />
          ))}
        </div>
        {course.live ? (
          <Link href={`/play/${course.live.sessionId}`} className="mt-2 inline-block font-pixel underline">
            Live now: join
          </Link>
        ) : (
          <p className="mt-2 text-xs">Waiting for your lecturer to open a Session.</p>
        )}
      </div>
    </div>
  );
}
