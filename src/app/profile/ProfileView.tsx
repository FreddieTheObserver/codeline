"use client";

import { useState } from "react";
import { PageShell } from "@/components/AppHeader";
import { Avatar, SHIRT_COLORS } from "@/components/pixel/Avatar";
import { Sprite } from "@/components/pixel/Sprite";
import { BADGE_ICONS, BLOOM, STAR } from "@/components/pixel/sprites";
import { Button, ErrorNote, Field, Heading, LanguageTag, Loading, Meter, Panel, Title, cx } from "@/components/ui";
import { errorText, patch, useApi } from "@/lib/client";
import { COSMETICS } from "@/domain/levels";
import type { AvatarDto, ProfileDto } from "@/lib/api-types";

export function ProfileView() {
  const { data, error, mutate } = useApi<ProfileDto>("/api/profile", { revalidateOnFocus: false });
  if (error) return <PageShell><ErrorNote>{error.message}</ErrorNote></PageShell>;
  if (!data) return <PageShell><Loading /></PageShell>;
  return <ProfileBody key={data.viewer.nickname + JSON.stringify(data.avatar)} data={data} onSaved={() => void mutate()} />;
}

function ProfileBody({ data, onSaved }: { data: ProfileDto; onSaved: () => void }) {
  const [nickname, setNickname] = useState(data.viewer.nickname);
  const [avatar, setAvatar] = useState<AvatarDto>(data.avatar);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const unlocked = new Set(data.unlocked.map((u) => u.id));

  async function save() {
    setError("");
    try {
      await patch("/api/profile", { nickname, avatar });
      setMessage("Saved.");
      onSaved();
    } catch (err) {
      setError(errorText(err));
    }
  }

  const slotChoice = (slot: "hat" | "tool" | "pet", label: string) => (
    <fieldset>
      <legend className="mb-1 text-sm font-bold">{label}</legend>
      <div className="flex flex-wrap gap-1">
        <button className={cx("px-btn !px-2 !py-1 text-xs", !avatar[slot] ? "px-btn-sun" : "px-btn-secondary")} onClick={() => setAvatar({ ...avatar, [slot]: undefined })}>
          None
        </button>
        {COSMETICS.filter((c) => c.slot === slot).map((c) => {
          const open = unlocked.has(c.id);
          return (
            <button
              key={c.id}
              disabled={!open}
              className={cx("px-btn !px-2 !py-1 text-xs", avatar[slot] === c.id ? "px-btn-sun" : "px-btn-secondary")}
              onClick={() => setAvatar({ ...avatar, [slot]: c.id })}
              title={open ? c.name : `Unlocks at Level ${c.level}`}
            >
              {open ? c.name : `Lv ${c.level}`}
            </button>
          );
        })}
      </div>
    </fieldset>
  );

  return (
    <PageShell>
      <Title>Your gardener</Title>
      <div className="mt-4 grid gap-4 md:grid-cols-[300px_1fr]">
        <Panel className="flex flex-col items-center text-center">
          <Avatar avatar={avatar} scale={8} label="Your avatar preview" />
          <p className="mt-2 font-pixel text-2xl">{nickname}</p>
          <p>Level {data.level.level} · {data.level.xp.toLocaleString()} XP</p>
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
                  onClick={() => setAvatar({ ...avatar, color: c })}
                  aria-label={`Shirt colour ${c}`}
                  aria-pressed={avatar.color === c}
                  className="h-8 w-8"
                  style={{ background: c, boxShadow: avatar.color === c ? "0 0 0 3px #fbf3df, 0 0 0 6px #3b2a1e" : "0 0 0 3px #3b2a1e" }}
                />
              ))}
            </div>
          </fieldset>
          {slotChoice("hat", "Hat")}
          {slotChoice("tool", "Tool")}
          {slotChoice("pet", "Companion")}
          <div className="flex items-center gap-2">
            <Button onClick={save}>Save</Button>
            {message && <span className="font-bold" role="status">{message}</span>}
          </div>
          <ErrorNote>{error}</ErrorNote>
        </Panel>
      </div>

      <Panel className="mt-4">
        <Heading>Badges</Heading>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.badges.map((b) => (
            <li key={b.id} className={cx("flex items-center gap-3 p-2", !b.earnedAt && "opacity-45 grayscale")} style={{ boxShadow: "0 0 0 2px #c9b48a" }}>
              <Sprite grid={BADGE_ICONS[b.icon] ?? STAR} scale={4} />
              <div>
                <p className="font-pixel">{b.name}</p>
                <p className="text-xs">{b.description}</p>
                {b.earnedAt && <p className="text-xs font-bold">Earned {new Date(b.earnedAt).toLocaleDateString()}</p>}
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel className="mt-4">
        <Heading>Almanac</Heading>
        <p className="text-sm">Every Exercise you have harvested, by language.</p>
        {data.almanac.length === 0 ? (
          <p className="mt-2">Plant every seed in your pouch during a Round to harvest your first crop.</p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.almanac.map((a) => (
              <li key={a.exerciseId} className="flex items-center gap-3 bg-grass-light p-3" style={{ boxShadow: "0 0 0 3px #4f8f3a" }}>
                <Sprite grid={BLOOM} scale={4} />
                <div>
                  <p className="font-pixel text-lg">{a.title}</p>
                  <p className="flex items-center gap-2 text-xs">
                    <LanguageTag language={a.language} /> {a.courseCode}
                  </p>
                  <p className="text-xs">Best Round: {a.bestPoints.toLocaleString()} points · first {new Date(a.firstAt).toLocaleDateString()}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </PageShell>
  );
}
