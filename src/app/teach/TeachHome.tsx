"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageShell } from "@/components/AppHeader";
import { Sprite } from "@/components/pixel/Sprite";
import { SPROUT, TREE } from "@/components/pixel/sprites";
import { Button, ButtonLink, ErrorNote, Field, Heading, LanguageTag, Loading, Panel, SampleTag, Title } from "@/components/ui";
import { errorText, post, useApi } from "@/lib/client";
import { LANGUAGES } from "@/domain/exercise-text";
import type { StaffCourseCard, Viewer } from "@/lib/api-types";

export function TeachHome() {
  const router = useRouter();
  const { data, error } = useApi<{ viewer: Viewer; courses: StaffCourseCard[] }>("/api/teach", { refreshInterval: 10000 });
  const [form, setForm] = useState({ code: "", title: "", language: "java" });
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError("");
    try {
      const { id } = await post<{ id: string }>("/api/teach", form);
      router.push(`/teach/courses/${id}`);
    } catch (err) {
      setFormError(errorText(err));
      setBusy(false);
    }
  }

  if (error) return <PageShell><ErrorNote>{error.message}</ErrorNote></PageShell>;
  if (!data) return <PageShell><Loading /></PageShell>;
  const isLecturer = data.viewer.role === "lecturer";

  return (
    <PageShell>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <Title>{isLecturer ? "My courses" : "Courses I assist"}</Title>
          <p className="text-ink">{isLecturer ? "Prepare Exercises, run live Sessions and follow each student's progress." : "Run Sessions for the courses you assist. The overview covers every course."}</p>
        </div>
        {!isLecturer && <ButtonLink href="/ta">Department overview</ButtonLink>}
      </div>

      <ul className="mt-4 grid gap-4 md:grid-cols-2">
        {data.courses.length === 0 && (
          <li>
            <Panel>{isLecturer ? "No courses yet. Create your first one below." : "You aren't assisting any course yet."}</Panel>
          </li>
        )}
        {data.courses.map((c) => (
          <li key={c.id}>
            <Panel className="relative h-full overflow-hidden">
              <div className="absolute -right-3 -top-2 opacity-80">
                <Sprite grid={TREE} scale={5} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <LanguageTag language={c.language} />
                {c.isSample && <SampleTag />}
              </div>
              <p className="mt-2 font-pixel text-3xl">{c.code}</p>
              <p className="font-bold">{c.title}</p>
              <p className="mt-1 text-sm">
                {c.enrolled} students · {c.exercises} Exercises · join code <span className="font-mono font-bold tracking-widest">{c.joinCode}</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-1">
                <ButtonLink href={`/teach/courses/${c.id}`}>Open course</ButtonLink>
                {c.live && (
                  <ButtonLink href={`/console/${c.live.sessionId}`} tone="sun">
                    <span className="inline-flex items-center gap-2">
                      <Sprite grid={SPROUT} scale={2} /> Live console
                    </span>
                  </ButtonLink>
                )}
              </div>
            </Panel>
          </li>
        ))}
      </ul>

      {isLecturer && (
        <Panel className="mt-6 max-w-2xl">
          <Heading>Create a course</Heading>
          <p className="text-sm">Any programming course the department offers, in any language.</p>
          <form onSubmit={create} className="mt-3 grid gap-3 sm:grid-cols-[140px_1fr_160px]">
            <Field label="Code">
              <input className="px-input uppercase" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="CSC102" required />
            </Field>
            <Field label="Title">
              <input className="px-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Data Structures" required />
            </Field>
            <Field label="Main language">
              <select className="px-input" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                {LANGUAGES.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-3">
              <ErrorNote>{formError}</ErrorNote>
              <Button type="submit" disabled={busy}>
                {busy ? "Creating..." : "Create course"}
              </Button>
            </div>
          </form>
        </Panel>
      )}
      <p className="mt-6 text-sm">
        <Link href="/about" className="underline">
          About CodeLine
        </Link>
      </p>
    </PageShell>
  );
}
