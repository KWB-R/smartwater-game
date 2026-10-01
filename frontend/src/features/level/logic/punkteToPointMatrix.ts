import {
  LEVEL_BONUS_CATEGORY_IDS,
  goalFocusDimensionForBonusCategory,
  readCategoryBonusPoints,
  type LevelPunkteRecord,
} from "@/domain/levelBonusCategories";
import { emptyPoints } from "@/features/level/logic/points";
import type { PointMatrix } from "@/features/level/types";

/** Übernimmt Kategoriepunkte aus der Strapi-Komponente punkte in die Spielmatrix. */
export function pointMatrixFromPunkte(punkte: LevelPunkteRecord): PointMatrix {
  const matrix = emptyPoints();
  let hasDimension = false;
  for (const categoryId of LEVEL_BONUS_CATEGORY_IDS) {
    const dim = goalFocusDimensionForBonusCategory(categoryId);
    const value = readCategoryBonusPoints(punkte, categoryId);
    if (value > 0) {
      matrix[dim] += value;
      hasDimension = true;
    }
  }
  matrix.default = hasDimension ? 1 : 0;
  return matrix;
}
