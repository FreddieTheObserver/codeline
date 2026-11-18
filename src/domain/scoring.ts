export const BASE_POINTS = 1000;
export const SPOTLIGHT_BONUS = 300;
const RETRY_MULTIPLIERS = [1, 0.5, 0.25];
const RETRY_FLOOR = 0.1;
const MAX_SPEED_BONUS = 0.3;
const STREAK_STEP = 0.1;
const STREAK_CAP = 1.5;

export function retryMultiplier(attempt: number): number {
  return RETRY_MULTIPLIERS[attempt - 1] ?? RETRY_FLOOR;
}

export function streakMultiplier(streak: number): number {
  if (streak <= 1) return 1;
  return Math.min(1 + STREAK_STEP * (streak - 1), STREAK_CAP);
}

export type ScoreInput = {
  // 1 for the first try at this Snippet, 2 for the first retry, and so on.
  attempt: number;
  // Fraction of the Round's time still left, from 0 to 1.
  timeLeft: number;
  // First-try correct Placements in a row before this one.
  streakBefore: number;
};

export type ScoreResult = { points: number; streakAfter: number };

export function scoreCorrect({ attempt, timeLeft, streakBefore }: ScoreInput): ScoreResult {
  const firstTry = attempt === 1;
  const streakAfter = firstTry ? streakBefore + 1 : 0;
  const speed = 1 + MAX_SPEED_BONUS * Math.min(Math.max(timeLeft, 0), 1);
  const points = BASE_POINTS * retryMultiplier(attempt) * speed * (firstTry ? streakMultiplier(streakAfter) : 1);
  return { points: Math.round(points), streakAfter };
}
