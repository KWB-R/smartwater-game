import {
  mapLevelPuzzleItems,
  mapLevelPlacementOrder,
} from "@/api/mappers/levelPuzzleMapper";
import { bonusRowsFromPuzzleItems } from "@/domain/levelBonusCategories";
import type {
  DistrictLevelPuzzleItem,
  DistrictLevelSummary,
  LevelPlacementOrderEntry,
} from "@/types/content";

/** puzzleItems kann im Router-Zustand und in Strapi-Antworten fehlen oder als Beziehungsobjekt vorliegen. */
export function puzzleItemsOrEmpty(
  level:
    | Pick<DistrictLevelSummary, "puzzleItems">
    | { puzzleItems?: DistrictLevelSummary["puzzleItems"] | unknown },
): DistrictLevelPuzzleItem[] {
  const raw = (level as { puzzleItems?: unknown }).puzzleItems;
  if (Array.isArray(raw)) {
    return raw as DistrictLevelPuzzleItem[];
  }
  if (raw == null) {
    return [];
  }
  return mapLevelPuzzleItems(raw);
}

export function placementOrderOrEmpty(
  level:
    | Pick<DistrictLevelSummary, "placementOrder" | "puzzleItems">
    | {
        placementOrder?: DistrictLevelSummary["placementOrder"];
        puzzleItems?: DistrictLevelSummary["puzzleItems"] | unknown;
      },
): LevelPlacementOrderEntry[] {
  const fromSummary = (level as { placementOrder?: LevelPlacementOrderEntry[] })
    .placementOrder;
  if ((fromSummary?.length ?? 0) > 0) {
    return fromSummary!;
  }
  const raw = (level as { puzzleItems?: unknown }).puzzleItems;
  if (raw != null && !Array.isArray(raw)) {
    return mapLevelPlacementOrder(raw);
  }
  return puzzleItemsOrEmpty(level).map((item) => ({
    kind: "puzzle" as const,
    uniqueId: item.uniqueId,
  }));
}

/** CMS-Feld `maxPuzzleItems` (Strapi) als positive Ganzzahl. */
export function parseCmsMaxPuzzleItems(
  value: number | null | undefined,
): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Math.floor(value);
}

/** maxPuzzleItems aus dem CMS übernehmen; die Detailantwort hat Vorrang vor der Bezirksliste. */
function applyCmsMaxPuzzleItems(
  level: DistrictLevelSummary,
  fromApi: DistrictLevelSummary | null,
  fromFallback: DistrictLevelSummary | null,
): DistrictLevelSummary {
  const fromDetail = parseCmsMaxPuzzleItems(fromApi?.maxPuzzleItems);
  if (fromDetail != null) {
    return { ...level, maxPuzzleItems: fromDetail };
  }
  const fromList = parseCmsMaxPuzzleItems(fromFallback?.maxPuzzleItems);
  if (fromList != null) {
    return { ...level, maxPuzzleItems: fromList };
  }
  return level;
}

/** Fehlende skalare CMS-Felder aus den Leveldaten der Bezirksliste ergänzen. */
function patchDistrictLevelSummaryFromFallback(
  primary: DistrictLevelSummary,
  fallback: DistrictLevelSummary | null,
): DistrictLevelSummary {
  if (!fallback) {
    return primary;
  }
  const assetsFolder = primary.assetsFolder ?? fallback.assetsFolder;
  const minimumScorePercentage =
    primary.minimumScorePercentage ?? fallback.minimumScorePercentage;
  const winContent = primary.winContent ?? fallback.winContent;
  const winningContent = primary.winningContent ?? fallback.winningContent;
  const mapMarkerPosition =
    primary.mapMarkerPosition ?? fallback.mapMarkerPosition;
  const maxPuzzleItems = primary.maxPuzzleItems ?? fallback.maxPuzzleItems;
  const primaryLevel =
    primary.primaryLevel === false || fallback.primaryLevel === false
      ? false
      : true;
  const shareable =
    primary.shareable === false || fallback.shareable === false
      ? false
      : true;
  if (
    assetsFolder === primary.assetsFolder &&
    minimumScorePercentage === primary.minimumScorePercentage &&
    winContent === primary.winContent &&
    winningContent === primary.winningContent &&
    mapMarkerPosition === primary.mapMarkerPosition &&
    maxPuzzleItems === primary.maxPuzzleItems &&
    primaryLevel === primary.primaryLevel &&
    shareable === primary.shareable
  ) {
    return primary;
  }
  return {
    ...primary,
    assetsFolder,
    minimumScorePercentage,
    winContent,
    winningContent,
    mapMarkerPosition,
    maxPuzzleItems,
    primaryLevel,
    shareable,
  };
}

/**
 * Führt die Detailantwort und die Leveldaten aus der Bezirksliste zusammen.
 * Puzzledaten kommen aus der vollständigeren Quelle; ein fehlendes assetsFolder aus der Liste.
 */
export function pickDistrictLevelSummary(
  fromApi: DistrictLevelSummary | null,
  fromFallback: DistrictLevelSummary | null,
): DistrictLevelSummary | null {
  let picked: DistrictLevelSummary | null = null;
  if (fromApi && puzzleItemsOrEmpty(fromApi).length > 0) {
    picked = fromApi;
  } else if (fromFallback && puzzleItemsOrEmpty(fromFallback).length > 0) {
    picked = fromFallback;
  } else {
    picked = fromApi ?? fromFallback;
  }
  if (!picked) {
    return null;
  }
  const merged = enrichDistrictLevelSummary(
    patchDistrictLevelSummaryFromFallback(picked, fromFallback),
  );
  return applyCmsMaxPuzzleItems(merged, fromApi, fromFallback);
}

/** Hält `achievableBonuses` synchron zu `puzzleItems`. */
export function enrichDistrictLevelSummary(
  level: DistrictLevelSummary,
): DistrictLevelSummary {
  const puzzleItems = puzzleItemsOrEmpty(level);
  const placementOrder =
    level.placementOrder?.length > 0
      ? level.placementOrder
      : placementOrderOrEmpty(level);
  return {
    ...level,
    puzzleItems,
    placementOrder,
    achievableBonuses: bonusRowsFromPuzzleItems(puzzleItems),
  };
}
