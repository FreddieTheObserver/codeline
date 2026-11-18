export type BadgeId =
  | "first-harvest"
  | "no-retry-round"
  | "sharp-eye"
  | "spotlighted"
  | "early-bird"
  | "loop-whisperer"
  | "polyglot"
  | "thinker";

export type BadgeDef = { id: BadgeId; name: string; description: string; icon: string };

export const BADGES: BadgeDef[] = [
  { id: "first-harvest", name: "First Harvest", description: "Placed every Snippet in your Hand in a Round", icon: "wheat" },
  { id: "no-retry-round", name: "No-Retry Round", description: "Finished a Round without a single wrong Placement", icon: "clover" },
  { id: "sharp-eye", name: "Sharp Eye", description: "Five first-try Placements in a row", icon: "eye" },
  { id: "spotlighted", name: "Spotlighted", description: "Your reason was pinned to the town noticeboard", icon: "pin" },
  { id: "early-bird", name: "Early Bird", description: "First in the class to place a Snippet correctly in a Round", icon: "bird" },
  { id: "loop-whisperer", name: "Loop Whisperer", description: "Placed a loop header right on the first try", icon: "loop" },
  { id: "polyglot", name: "Polyglot", description: "Harvested Exercises in two languages", icon: "globe" },
  { id: "thinker", name: "Thinker", description: "Gave a reason for ten Placements", icon: "bulb" },
];

export const BADGE_BY_ID = Object.fromEntries(BADGES.map((b) => [b.id, b])) as Record<BadgeId, BadgeDef>;

export function isLoopHeader(code: string): boolean {
  return /^\s*(for|while|do)\b/.test(code);
}

export const SHARP_EYE_STREAK = 5;
export const THINKER_REASONS = 10;
