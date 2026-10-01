import type { GoalFocusDimension, PointMatrix } from "@/features/level/types";

const emptyPoints = (): PointMatrix => ({
  default: 0,
  cooling: 0,
  flooding: 0,
  water: 0,
  biodiversity: 0,
  quality: 0,
});

/**
 * Kumuliert Punktmatrizen: `default` immer; Fokus-Dimensionen nur, wenn sie zu
 * aktiven Missions-Typen gehören (CMS / Level-Fokus → {@link activeMissionGoalDimensions}).
 */
const addPoints = (
  a: PointMatrix,
  b: PointMatrix,
  activeMissionDimensions: ReadonlySet<GoalFocusDimension>,
): PointMatrix => {
  const { default: aDefault, ...aFocus } = a;
  const { default: bDefault, ...bFocus } = b;
  const next = { default: aDefault + bDefault } as PointMatrix;
  for (const k of Object.keys(aFocus) as GoalFocusDimension[]) {
    next[k] = activeMissionDimensions.has(k)
      ? aFocus[k] + bFocus[k]
      : aFocus[k];
  }
  return next;
};

export { addPoints, emptyPoints };

/** Zusätzlicher Rand in Referenzpixeln, der das Ablegen erleichtert. */
export const PLACEMENT_TOLERANCE_PX = 40;
