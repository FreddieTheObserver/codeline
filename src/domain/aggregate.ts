import { normalizeCode } from "./judge";

export type AggRow = { id: string; position: number; pseudocode: string; code: string; given: boolean };
export type AggHand = { roundId?: string; userId: string; rowId: string; placedSlotId: string | null };
export type AggPlacement = { roundId?: string; userId: string; rowId: string; slotId: string; correct: boolean; attempt: number };

export type SlotStat = {
  slotId: string;
  position: number;
  pseudocode: string;
  heldBy: number;
  placedCorrect: number;
  firstTryCorrect: number;
  // Share of holders who placed it right on the first try, 0 to 1; null when nobody held it.
  firstTryRate: number | null;
  // Where holders of this step's Snippet most often put it by mistake.
  commonWrong: { slotId: string; position: number; pseudocode: string; holders: number; share: number } | null;
};

export function slotStats(rows: readonly AggRow[], hands: readonly AggHand[], placements: readonly AggPlacement[]): SlotStat[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const codeOf = (rowId: string) => normalizeCode(byId.get(rowId)?.code ?? "");

  return rows
    .filter((r) => !r.given)
    .map((slot) => {
      const code = normalizeCode(slot.code);
      const holderHands = hands.filter((h) => codeOf(h.rowId) === code);
      // One holding per Round: the same student can hold the same line again in a later Round.
      const holders = new Set(holderHands.map((h) => `${h.roundId ?? ""}:${h.userId}:${h.rowId}`));
      const intoSlot = placements.filter((p) => p.slotId === slot.id && p.correct);

      // A placement belongs to this step when its Snippet reads the same as this Slot's code.
      const wrong = placements.filter((p) => !p.correct && codeOf(p.rowId) === code);
      const wrongBySlot = new Map<string, Set<string>>();
      for (const p of wrong) {
        const set = wrongBySlot.get(p.slotId) ?? new Set<string>();
        set.add(`${p.roundId ?? ""}:${p.userId}`);
        wrongBySlot.set(p.slotId, set);
      }
      let commonWrong: SlotStat["commonWrong"] = null;
      for (const [slotId, users] of wrongBySlot) {
        if (!commonWrong || users.size > commonWrong.holders) {
          const target = byId.get(slotId);
          commonWrong = {
            slotId,
            position: target?.position ?? -1,
            pseudocode: target?.pseudocode ?? "",
            holders: users.size,
            share: holders.size ? users.size / holders.size : 0,
          };
        }
      }

      const firstTryCorrect = intoSlot.filter((p) => p.attempt === 1).length;
      return {
        slotId: slot.id,
        position: slot.position,
        pseudocode: slot.pseudocode,
        heldBy: holders.size,
        placedCorrect: intoSlot.length,
        firstTryCorrect,
        firstTryRate: holders.size ? Math.min(1, firstTryCorrect / holders.size) : null,
        commonWrong,
      };
    });
}

export function classProgress(hands: readonly AggHand[]): { placed: number; dealt: number } {
  return { placed: hands.filter((h) => h.placedSlotId).length, dealt: hands.length };
}

export type StudentStat = {
  userId: string;
  rounds: number;
  placements: number;
  firstTryRate: number | null;
  avgRetries: number | null;
};

// Per student: first-try rate over Snippets they placed, and wrong tries per Snippet.
export function studentStats(placements: readonly (AggPlacement & { roundId: string })[]): Map<string, StudentStat> {
  const out = new Map<string, StudentStat>();
  const grouped = new Map<string, (AggPlacement & { roundId: string })[]>();
  for (const p of placements) {
    const list = grouped.get(p.userId) ?? [];
    list.push(p);
    grouped.set(p.userId, list);
  }
  for (const [userId, list] of grouped) {
    const corrects = list.filter((p) => p.correct);
    const wrongs = list.length - corrects.length;
    out.set(userId, {
      userId,
      rounds: new Set(list.map((p) => p.roundId)).size,
      placements: corrects.length,
      firstTryRate: corrects.length ? corrects.filter((p) => p.attempt === 1).length / corrects.length : null,
      avgRetries: corrects.length ? wrongs / corrects.length : null,
    });
  }
  return out;
}
