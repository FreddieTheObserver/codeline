"use client";

import { useState } from "react";
import { useToast } from "@/components/feedback";
import { PageShell } from "@/components/PageShell";
import { useLeaveGuard } from "@/components/useLeaveGuard";
import { Avatar, SHIRT_COLORS } from "@/components/pixel/Avatar";
import { Sprite } from "@/components/pixel/Sprite";
import { BADGE_ICONS, BLOOM, STAR } from "@/components/pixel/sprites";
import { Button, EmptyState, ErrorNote, ErrorState, Field, Heading, LanguageTag, Loading, Meter, PageHeader, Panel, cx } from "@/components/ui";
import { errorText, patch, useApi } from "@/lib/client";
import { COSMETICS } from "@/domain/levels";
import type { AvatarDto, ProfileDto } from "@/lib/api-types";

export function ProfileView() {
  const { data, error, mutate } = useApi<ProfileDto>("/api/profile", { revalidateOnFocus: false });
  if (error) return <PageShell><ErrorState message={error.message} backHref="/home" backLabel="Back to your valley" /></PageShell>;
  if (!data) return <PageShell><Loading /></PageShell>;
  return <ProfileBody key={data.viewer.nickname + JSON.stringify(data.avatar)} data={data} onSaved={() => mutate()} />;
}

const sameAvatar = (a: AvatarDto, b: AvatarDto) => a.hat === b.hat && a.tool === b.tool && a.pet === b.pet && a.color === b.color;

function ProfileBody({ data, onSaved }: { data: ProfileDto; onSaved: () => Promise<unknown> }) {
  const toast = useToast();
  const [nickname, setNickname] = useState(data.viewer.nickname);
  const [avatar, setAvatar] = useState<AvatarDto>(data.avatar);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const unlocked = new Set(data.unlocked.map((u) => u.id));
  const dirty = nickname !== data.viewer.nickname || !sameAvatar(avatar, data.avatar);
  useLeaveGuard(dirty, "your gardener");

  async function save() {
    setError("");
    setBusy(true);
    try {
      await patch("/api/profile", { nickname, avatar });
      toast("Your gardener is saved.");
      await onSaved();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  function discard() {
    setNickname(data.viewer.nickname);
    setAvatar(data.avatar);
    setError("");
  }

  const slotChoice = (slot: "hat" | "tool" | "pet", label: string) => (
    <fieldset>
      <legend className="mb-1 text-sm font-bold">{label}</legend>
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          aria-pressed={!avatar[slot]}
          className={cx("px-btn !px-2 !py-1 text-xs", !avatar[slot] ? "px-btn-sun" : "px-btn-secondary")}
          onClick={() => setAvatar({ ...avatar, [slot]: undefined })}
        >
          None
        </button>
        {COSMETICS.filter((c) => c.slot === slot).map((c) => {
          const open = unlocked.has(c.id);
          return (
            <button
              key={c.id}
              type="button"
              disabled={!open}
              aria-pressed={avatar[slot] === c.id}
              className={cx("px-btn !px-2 !py-1 text-xs", avatar[slot] === c.id ? "px-btn-sun" : "px-btn-secondary")}
              onClick={() => setAvatar({ ...avatar, [slot]: c.id })}
              title={open ? c.name : `Unlocks at Level ${c.level}`}
            >
              {open ? c.name : `${c.name} · Lv ${c.level}`}
            </button>
          );
        })}
      </div>
    </fieldset>
  );

  return (
    <PageShell reveal>
      <PageHeader title="Your gardener" description="Choose how classmates see you on the projector, and look back at your badges and harvests." />
      <div className="grid items-start gap-4 md:grid-cols-[300px_minmax(0,1fr)]">
        <Panel className="flex flex-col items-center text-center">
          <Avatar avatar={avatar} scale={8} label="Your avatar preview" />
          <p className="mt-2 font-pixel text-2xl">{nickname || data.viewer.nickname}</p>
          <p>
            Level {data.level.level} · {data.level.xp.toLocaleString()} XP
          </p>
          <div className="mt-2 w-full">
            <Meter value={data.level.into} max={data.level.span} color="#f6c445" label="XP to next Level" />
          </div>
          <p className="mt-1 text-xs">Points you earn in Sessions become XP. Levels unlock new items.</p>
        </Panel>
        <Panel className="flex flex-col gap-4">
          <Field label="Nickname" hint="Classmates see this on the projector; your lecturer sees your real name.">
            <input className="px-input" value={nickname} maxLength={20} onChange={(e) => setNickname(e.target.value)} />
          </Field>
          <fieldset>
            <legend className="mb-1 text-sm font-bold">Shirt colour</legend>
            <div className="flex flex-wrap gap-2">
              {SHIRT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setAvatar({ ...avatar, color: c })}
                  aria-label={`Shirt colour ${c}`}
                  aria-pressed={avatar.color === c}
                  className="m-[3px] h-8 w-8"
                  style={{ background: c, boxShadow: avatar.color === c ? "0 0 0 3px #fbf3df, 0 0 0 6px #3b2a1e" : "0 0 0 3px #3b2a1e" }}
                />
              ))}
            </div>
          </fieldset>
          {slotChoice("hat", "Hat")}
          {slotChoice("tool", "Tool")}
          {slotChoice("pet", "Companion")}
          <ErrorNote>{error}</ErrorNote>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t-2 border-parchment-dark pt-3">
            <Button onClick={save} busy={busy} disabled={!dirty}>
              {busy ? "Saving" : "Save changes"}
            </Button>
            {dirty && (
              <button type="button" className="text-sm underline underline-offset-2" onClick={discard}>
                Discard changes
              </button>
            )}
            <span className="text-sm text-ink-soft" role="status">
              {dirty ? "You have unsaved changes." : "Everything is saved."}
            </span>
          </div>
        </Panel>
      </div>

      <Panel className="mt-4">
        <Heading>Badges</Heading>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.badges.map((b) => (
            <li key={b.id} className={cx("px-row flex items-center gap-3 p-2", !b.earnedAt && "opacity-45 grayscale")}>
              <Sprite grid={BADGE_ICONS[b.icon] ?? STAR} scale={4} />
              <div>
                <p className="font-pixel">{b.name}</p>
                <p className="text-xs">{b.description}</p>
                <p className="text-xs font-bold">{b.earnedAt ? `Earned ${new Date(b.earnedAt).toLocaleDateString()}` : "Not earned yet"}</p>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel className="mt-4">
        <Heading>Almanac</Heading>
        <p className="text-sm">Every Exercise you have harvested, by language.</p>
        {data.almanac.length === 0 ? (
          <EmptyState title="No harvests yet">Plant every seed in your pouch during a Round to harvest your first crop.</EmptyState>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.almanac.map((a) => (
              <li key={a.exerciseId} className="flex items-center gap-3 border-4 border-grass-dark bg-grass-light p-3">
                <Sprite grid={BLOOM} scale={4} />
                <div>
                  <p className="font-pixel text-lg">{a.title}</p>
                  <p className="flex items-center gap-2 text-xs">
                    <LanguageTag language={a.language} /> {a.courseCode}
                  </p>
                  <p className="text-xs">
                    Best Round: {a.bestPoints.toLocaleString()} points · first {new Date(a.firstAt).toLocaleDateString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </PageShell>
  );
}
