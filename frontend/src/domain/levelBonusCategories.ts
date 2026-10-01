import type { GoalFocusDimension } from "@/domain/pointMatrix";

export type LevelBonusCategoryId =
  | "bio"
  | "water_protection"
  | "climate"
  | "green_spaces"
  | "green_water"
  | "flood_prevention";

export const LEVEL_BONUS_CATEGORY_IDS = [
  "bio",
  "water_protection",
  "climate",
  "green_spaces",
  "green_water",
  "flood_prevention",
] as const satisfies readonly LevelBonusCategoryId[];

export function isLevelBonusCategoryId(
  value: string,
): value is LevelBonusCategoryId {
  return (LEVEL_BONUS_CATEGORY_IDS as readonly string[]).includes(value);
}

const LEVEL_BONUS_CATEGORY_DIMENSIONS = {
  bio: "biodiversity",
  water_protection: "water",
  climate: "cooling",
  green_spaces: "quality",
  green_water: "water",
  flood_prevention: "flooding",
} as const satisfies Record<LevelBonusCategoryId, GoalFocusDimension>;

export function goalFocusDimensionForBonusCategory(
  categoryId: LevelBonusCategoryId,
): GoalFocusDimension {
  return LEVEL_BONUS_CATEGORY_DIMENSIONS[categoryId];
}

/** Strapi `object.punkte`: Kategorie als verschachteltes Objekt. */
type CategoryPunkteEntry = {
  bonus?: number;
  isBonus?: boolean;
  isMission?: boolean;
};

/** Unterstützt ältere flache Felder und verschachtelte Kategorien. */
type LevelPunkteBonusFields = {
  bio_bonus?: number;
  bio_isBonus?: boolean;
  bio_isMission?: boolean;
  water_protection_bonus?: number;
  water_protection_isBonus?: boolean;
  water_protection_isMission?: boolean;
  climate_bonus?: number;
  climate_isBonus?: boolean;
  climate_isMission?: boolean;
  green_spaces_bonus?: number;
  green_spaces_isBonus?: boolean;
  green_spaces_isMission?: boolean;
  green_water_bonus?: number;
  green_water_isBonus?: boolean;
  green_water_isMission?: boolean;
  flood_prevention_bonus?: number;
  flood_prevention_isBonus?: boolean;
  flood_prevention_isMission?: boolean;
};

export type LevelPunkteRecord = LevelPunkteBonusFields &
  Partial<Record<LevelBonusCategoryId, CategoryPunkteEntry>>;

export type LevelBonusRow = {
  id: LevelBonusCategoryId;
  label: string;
  count: number;
};

const CATEGORY_DEFS: {
  id: LevelBonusCategoryId;
  label: string;
}[] = [
  {
    id: "bio",
    label: "Biodiversität",
  },
  {
    id: "water_protection",
    label: "Gewässerschutz",
  },
  {
    id: "climate",
    label: "Stadtklima",
  },
  {
    id: "green_spaces",
    label: "Neue grüne Freiräume",
  },
  {
    id: "green_water",
    label: "Wasser für Stadtgrün",
  },
  {
    id: "flood_prevention",
    label: "Überflutungsvorsorge",
  },
];

const CATEGORY_BY_ID = new Map(
  CATEGORY_DEFS.map((def) => [def.id, def] as const),
);

export function readCategoryIsBonus(
  punkte: LevelPunkteRecord,
  categoryId: LevelBonusCategoryId,
): boolean {
  const nested = punkte[categoryId];
  if (nested && typeof nested === "object") {
    return (nested as CategoryPunkteEntry).isBonus === true;
  }
  const flatKey = `${categoryId}_isBonus` as keyof LevelPunkteBonusFields;
  return punkte[flatKey] === true;
}

function readCategoryIsMission(
  punkte: LevelPunkteRecord,
  categoryId: LevelBonusCategoryId,
): boolean {
  const nested = punkte[categoryId];
  if (nested && typeof nested === "object") {
    return (nested as CategoryPunkteEntry).isMission === true;
  }
  const flatKey = `${categoryId}_isMission` as keyof LevelPunkteBonusFields;
  return punkte[flatKey] === true;
}

export function readCategoryBonusPoints(
  punkte: LevelPunkteRecord,
  categoryId: LevelBonusCategoryId,
): number {
  const nested = punkte[categoryId];
  if (nested && typeof nested === "object") {
    const bonus = (nested as CategoryPunkteEntry).bonus;
    if (typeof bonus === "number" && Number.isFinite(bonus)) {
      return bonus;
    }
  }
  const flatKey = `${categoryId}_bonus` as keyof LevelPunkteBonusFields;
  const flat = punkte[flatKey];
  return typeof flat === "number" && Number.isFinite(flat) ? flat : 0;
}

/** Reihenfolge der Missionszeilen im Puzzleteildetail. */
export const TILE_DETAIL_CATEGORY_ORDER = [
  "bio",
  "water_protection",
  "climate",
  "flood_prevention",
  "green_spaces",
  "green_water",
] as const satisfies readonly LevelBonusCategoryId[];

/** Eine Kategorie gehört zur Levelmission, wenn ein Puzzleteil isMission setzt. */
export function levelMissionCategoryIds(
  puzzleItems: ReadonlyArray<{ punkte: LevelPunkteRecord }>,
): Set<LevelBonusCategoryId> {
  const ids = new Set<LevelBonusCategoryId>();
  for (const item of puzzleItems) {
    for (const id of TILE_DETAIL_CATEGORY_ORDER) {
      if (readCategoryIsMission(item.punkte, id)) {
        ids.add(id);
      }
    }
  }
  return ids;
}

export function getLevelBonusCategoryMeta(id: LevelBonusCategoryId): {
  label: string;
} {
  const def = CATEGORY_BY_ID.get(id);
  if (!def) {
    throw new Error(`Unknown level bonus category: ${id}`);
  }
  return { label: def.label };
}

/** Ermittelt erreichbare Bonuskategorien aus den Puzzleteilen. */
export function bonusRowsFromPuzzleItems(
  puzzleItems: ReadonlyArray<{ punkte: LevelPunkteRecord }>,
): LevelBonusRow[] {
  return aggregateLevelBonusRows(puzzleItems.map((item) => item.punkte));
}

/** Zählt pro Kategorie die Puzzleteile mit isBonus. */
function aggregateLevelBonusRows(
  punkteList: LevelPunkteRecord[],
): LevelBonusRow[] {
  const totals = new Map<LevelBonusCategoryId, number>(
    CATEGORY_DEFS.map((def) => [def.id, 0]),
  );

  for (const punkte of punkteList) {
    for (const def of CATEGORY_DEFS) {
      if (!readCategoryIsBonus(punkte, def.id)) {
        continue;
      }
      totals.set(def.id, (totals.get(def.id) ?? 0) + 1);
    }
  }

  return CATEGORY_DEFS.map((def) => ({
    id: def.id,
    label: def.label,
    count: totals.get(def.id) ?? 0,
  })).filter((row) => row.count > 0);
}
