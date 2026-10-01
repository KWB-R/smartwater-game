import { emptyPoints } from "@/features/level/logic/points";
import type { PointMatrix } from "@/features/level/types";

/** Punkte-Matrix, die beim Anzeige-Balken genau `score` ergibt (nur `default`). */
export function pointMatrixForBarBonus(score: number): PointMatrix {
  if (score <= 0) {
    return emptyPoints();
  }
  return {
    ...emptyPoints(),
    default: score,
  };
}
