import type { Rng } from "./random";

export const TEAM_NAMES = ["Sunflower Farm", "Bluebell Farm", "Clover Farm", "Pumpkin Farm", "Lavender Farm", "Maple Farm"];
export const TEAM_COLORS = ["#e9b949", "#5b8fd6", "#5aa469", "#e07b39", "#9a7bd1", "#c75a4f"];

// Joins the smallest Team, breaking ties at random, so Teams stay balanced.
export function pickTeam(memberCounts: readonly number[], rng: Rng): number {
  const smallest = Math.min(...memberCounts);
  const candidates = memberCounts.flatMap((count, team) => (count === smallest ? [team] : []));
  return candidates[Math.floor(rng() * candidates.length)];
}

export function teamScore(memberPoints: readonly number[]): number {
  if (memberPoints.length === 0) return 0;
  return Math.round(memberPoints.reduce((a, b) => a + b, 0) / memberPoints.length);
}
