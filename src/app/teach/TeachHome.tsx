"use client";

import { useRouter } from "next/navigation";
import { useLayoutEffect, useState } from "react";
import { Modal, useToast } from "@/components/feedback";
import { usePresence } from "@/components/motion";
import { PageShell } from "@/components/PageShell";
import { Sprite } from "@/components/pixel/Sprite";
import { SPROUT, TREE } from "@/components/pixel/sprites";
import { Button, ButtonLink, EmptyState, ErrorNote, ErrorState, Field, LanguageTag, Loading, PageHeader, Panel, SampleTag } from "@/components/ui";
import { errorText, post, useApi } from "@/lib/client";
import { LANGUAGES } from "@/domain/exercise-text";
import type { StaffCourseCard, Viewer } from "@/lib/api-types";

export function TeachHome() {
  const { data, error } = useApi<{ viewer: Viewer; courses: StaffCourseCard[] }>("/api/teach", { refreshInterval: 10000 });
  const [creating, setCreating] = useState(false);
  // Next.js keeps this page alive while hidden; a dialog left open must not be waiting when the lecturer returns.
  useLayoutEffect(() => () => setCreating(false), []);
  const createDialog = usePresence(creating);

  if (error) return <PageShell><ErrorState message={error.message} backHref="/" backLabel="Back to the start" /></PageShell>;
  if (!data) return <PageShell><Loading /></PageShell>;
  const isLecturer = data.viewer.role === "lecturer";

  return (
    <PageShell reveal>
      <PageHeader
        title={isLecturer ? "My courses" : "Courses I assist"}
        description={
          isLecturer
            ? "Prepare Exercises, run live Sessions and follow each student's progress."
            : "Run Sessions for the courses you assist. The department overview covers every course."
        }
        actions={
          isLecturer ? (
            <Button onClick={() => setCreating(true)}>New course</Button>
          ) : (
            <ButtonLink href="/ta" tone="secondary">
              Department overview
            </ButtonLink>
          )
        }
      />

      {data.courses.length === 0 ? (
        <Panel>
          <EmptyState
            title={isLecturer ? "No courses yet" : "No courses to assist yet"}
            action={isLecturer ? <Button onClick={() => setCreating(true)}>Create your first course</Button> : undefined}
          >
            {isLecturer ? "A course holds its Exercises, its enrolled students and its Sessions." : "A lecturer adds you to a course they want help running."}
          </EmptyState>
        </Panel>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.courses.map((c) => (
            <li key={c.id} className="flex">
              <CourseCardView course={c} />
            </li>
          ))}
        </ul>
      )}

      {createDialog.mounted && <CreateCourseDialog closing={createDialog.closing} onClose={() => setCreating(false)} />}
    </PageShell>
  );
}

function CourseCardView({ course: c }: { course: StaffCourseCard }) {
  return (
    <Panel className="relative flex w-full flex-col overflow-hidden">
      <div className="absolute -right-3 -top-2 opacity-80" aria-hidden="true">
        <Sprite grid={TREE} scale={5} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <LanguageTag language={c.language} />
        {c.isSample && <SampleTag />}
      </div>
      <p className="mt-2 font-pixel text-3xl">{c.code}</p>
      <p className="font-bold">{c.title}</p>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
        <div className="px-row p-1">
          <dt>Students</dt>
          <dd className="font-pixel text-lg">{c.enrolled}</dd>
        </div>
        <div className="px-row p-1">
          <dt>Exercises</dt>
          <dd className="font-pixel text-lg">{c.exercises}</dd>
        </div>
        <div className="px-row p-1">
          <dt>Join code</dt>
          <dd className="font-mono text-base font-bold leading-7 tracking-wider">{c.joinCode}</dd>
        </div>
      </dl>
      <div className="mt-auto flex flex-wrap gap-1 pt-3">
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
  );
}

function CreateCourseDialog({ closing, onClose }: { closing: boolean; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({ code: "", title: "", language: "java" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { id } = await post<{ id: string }>("/api/teach", form);
      toast(`${form.code.toUpperCase()} is ready. Add its first Exercise next.`);
      router.push(`/teach/courses/${id}`);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <Modal title="Create a course" closing={closing} onClose={onClose}>
      <p className="mt-1 text-sm">Any programming course the department offers, in any language. Students enrol with the join code CodeLine creates for it.</p>
      <form onSubmit={create} className="mt-3 grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
        <Field label="Code">
          <input
            className="px-input uppercase"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            placeholder="CSC102"
            required
            data-autofocus=""
          />
        </Field>
        <Field label="Title">
          <input className="px-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Data Structures" required />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Main language">
            <select className="px-input" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="sm:col-span-2">
          <ErrorNote>{error}</ErrorNote>
          <div className="mt-2 flex flex-wrap justify-end gap-1">
            <Button type="button" tone="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" busy={busy}>
              {busy ? "Creating" : "Create course"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
