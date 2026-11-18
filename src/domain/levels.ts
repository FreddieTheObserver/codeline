// Level n starts at 1000 * n * (n - 1) / 2 XP: 0, 1000, 3000, 6000, 10000, ...
export function xpForLevel(level: number): number {
  return (1000 * level * (level - 1)) / 2;
}

export function levelForXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

export function levelProgress(xp: number): { level: number; into: number; span: number } {
  const level = levelForXp(xp);
  const start = xpForLevel(level);
  return { level, into: xp - start, span: xpForLevel(level + 1) - start };
}

export type Cosmetic = { id: string; slot: "hat" | "tool" | "pet"; name: string; level: number };

export const COSMETICS: Cosmetic[] = [
  { id: "straw-hat", slot: "hat", name: "Straw hat", level: 2 },
  { id: "watering-can", slot: "tool", name: "Watering can", level: 3 },
  { id: "flower-crown", slot: "hat", name: "Flower crown", level: 4 },
  { id: "cat", slot: "pet", name: "Garden cat", level: 5 },
  { id: "golden-hoe", slot: "tool", name: "Golden hoe", level: 6 },
  { id: "sunflower-hat", slot: "hat", name: "Sunflower hat", level: 7 },
  { id: "dog", slot: "pet", name: "Farm dog", level: 8 },
  { id: "wizard-hat", slot: "hat", name: "Night-owl hat", level: 10 },
];

export function unlockedCosmetics(level: number): Cosmetic[] {
  return COSMETICS.filter((c) => c.level <= level);
}
