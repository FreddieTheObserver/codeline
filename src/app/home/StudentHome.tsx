"use client";

import { useState } from "react";
import { useToast } from "@/components/feedback";
import { PageShell } from "@/components/PageShell";
import { Avatar } from "@/components/pixel/Avatar";
import { Sprite } from "@/components/pixel/Sprite";
import { BLOOM, FENCE, SIGN, SPROUT, STAR, TREE } from "@/components/pixel/sprites";
import { Button, ButtonLink, ErrorNote, ErrorState, Heading, LanguageTag, Loading, Meter, PageHeader, Panel, SampleTag } from "@/components/ui";
import { errorText, post, useApi } from "@/lib/client";
import type { CourseCard, StudentHome as Home } from "@/lib/api-types";

export function StudentHome() {
  const { data, error, mutate } = useApi<Home>("/api/home", { refreshInterval: 8000 });
  const toast = useToast();
  const [code, setCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setJoining(true);
    setJoinError("");
    try {
      const course = await post<CourseCard>("/api/courses/join", { code });
      setCode("");
      toast(course.live ? `You joined ${course.code}. A Session is live now!` : `You joined ${course.code} · ${course.title}.`);
      await mutate();
    } catch (err) {
      setJoinError(errorText(err));
    } finally {
      setJoining(false);
    }
  }

  if (error) return <PageShell><ErrorState message={error.message} backHref="/" backLabel="Back to the start" /></PageShell>;
  if (!data) return <PageShell><Loading /></PageShell>;
  const live = data.courses.filter((c) => c.live);

  return (
    <PageShell>
      <PageHeader title={`Hi, ${data.viewer.nickname}`} description="Your courses, live Sessions and progress, all in one valley." />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-4">
          {live.map((c) => (
            // Phones stack the card, so its sprout shrinks to sit beside "Live now"; from sm up it is one row.
            <Panel key={c.id} className="flex flex-col gap-3 !bg-[#fff3c4] sm:flex-row sm:items-center sm:gap-4">
              <span className="anim-bob hidden shrink-0 sm:block">
                <Sprite grid={SPROUT} scale={5} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-pixel text-sm uppercase">
                  <span className="anim-bob sm:hidden">
                    <Sprite grid={SPROUT} scale={3} />
                  </span>
                  Live now
                </p>
                <p className="font-pixel text-xl sm:text-2xl">
                  {c.code} · {c.title}
                </p>
                <p className="text-sm">{c.live?.status === "lobby" ? "The gate is open. Come in and wait for the first Round." : "A Round is growing right now."}</p>
              </div>
              <ButtonLink href={`/play/${c.live!.sessionId}`} tone="sun" className="shrink-0 text-lg whitespace-nowrap">
                Join the garden
              </ButtonLink>
            </Panel>
          ))}

          <Panel>
            <Heading>Your courses</Heading>
            {data.courses.length === 0 ? (
              <div className="mt-3 flex items-center gap-4">
                <Sprite grid={SIGN} scale={4} />
                <p>You aren&apos;t in any course yet. Enter the join code your lecturer shows on the projector, just below.</p>
              </div>
            ) : (
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {data.courses.map((c) => (
                  <li key={c.id} className="flex">
                    <CourseField course={c} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel>
            <Heading>Join a course</Heading>
            <p className="text-sm">Enter the gate code your lecturer shows on the projector. You only do this once per course.</p>
            <form onSubmit={join} className="mt-3 flex flex-wrap items-end gap-x-2">
              <label className="min-w-[200px] flex-1">
                <span className="mb-1 block text-sm font-bold">Course join code</span>
                <input
                  className="px-input font-mono uppercase tracking-[0.3em]"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setJoinError("");
                  }}
                  placeholder="MEADOW"
                  maxLength={12}
                  autoComplete="off"
                  required
                />
              </label>
              <Button type="submit" disabled={joining || !code.trim()}>
                {joining ? "Opening..." : "Join course"}
              </Button>
            </form>
            <ErrorNote>{joinError}</ErrorNote>
          </Panel>
        </div>

        <aside aria-label="Your progress">
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
              <div className="px-row flex flex-col items-center gap-1 p-2">
                <Sprite grid={STAR} scale={3} />
                <p className="font-pixel text-xl">{data.badgeCount}</p>
                <p>Badges</p>
              </div>
              <div className="px-row flex flex-col items-center gap-1 p-2">
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
    <div className="relative flex w-full flex-col overflow-hidden border-4 border-grass-dark bg-grass-light p-3">
      <div className="absolute -right-2 bottom-0 opacity-90" aria-hidden="true">
        <Sprite grid={TREE} scale={4} />
      </div>
      <div className="relative flex flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2">
          <LanguageTag language={course.language} />
          {course.isSample && <SampleTag />}
        </div>
        <p className="mt-2 font-pixel text-2xl">{course.code}</p>
        <p className="max-w-[75%] text-sm font-bold">{course.title}</p>
        <div className="mt-2 flex" aria-hidden="true">
          {Array.from({ length: 3 }, (_, i) => (
            <Sprite key={i} grid={FENCE} scale={3} />
          ))}
        </div>
        <div className="mt-auto pt-2">
          {course.live ? (
            <ButtonLink href={`/play/${course.live.sessionId}`} tone="sun" className="!px-3 !py-1 text-sm">
              Live now: join
            </ButtonLink>
          ) : (
            <p className="text-xs">Waiting for your lecturer to open a Session.</p>
          )}
        </div>
      </div>
    </div>
  );
}
