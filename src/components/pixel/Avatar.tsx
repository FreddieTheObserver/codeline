import { Sprite } from "./Sprite";
import { FARMER, HATS, PETS, TOOLS } from "./sprites";
import type { AvatarDto } from "@/lib/api-types";

export const SHIRT_COLORS = ["#e9b949", "#5b8fd6", "#5aa469", "#e07b39", "#9a7bd1", "#c75a4f", "#4fb3a9", "#f29bb6"];

export function Avatar({ avatar, scale = 4, label }: { avatar?: AvatarDto; scale?: number; label?: string }) {
  const a = avatar ?? {};
  const hat = a.hat ? HATS[a.hat] : undefined;
  return (
    <span className="relative inline-flex items-end gap-1" role="img" aria-label={label ?? "Gardener avatar"}>
      <span className="relative inline-block">
        <Sprite grid={FARMER} scale={scale} overrides={{ c: a.color ?? "#e9b949" }} />
        {hat && (
          <span className="absolute left-0 top-0">
            <Sprite grid={hat} scale={scale} />
          </span>
        )}
      </span>
      {a.tool && TOOLS[a.tool] && <Sprite grid={TOOLS[a.tool]} scale={Math.max(2, scale - 1)} />}
      {a.pet && PETS[a.pet] && <Sprite grid={PETS[a.pet]} scale={Math.max(2, scale - 1)} />}
    </span>
  );
}
