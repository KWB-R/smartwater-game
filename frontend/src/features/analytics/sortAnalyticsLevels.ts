import { getBonusLevels, getPrimaryLevel } from "@/features/map/mapBonusLevelUnlock";
import { levelMatchesRouteParam } from "@/features/level/levelProgress";
import type { District, DistrictLevelSummary } from "@/types/content";

const UNKNOWN_RANK_BASE = 1_000_000;

type LevelSortRow = {
  levelSlug: string;
  levelTitle: string;
};

function levelSortKeys(level: DistrictLevelSummary): string[] {
  const keys = new Set<string>();
  const slug = level.slug?.trim();
  if (slug) keys.add(slug);
  if (level.documentId?.trim()) keys.add(level.documentId.trim());
  keys.add(String(level.id));
  return [...keys];
}

/** Reihenfolge: Bezirk A–Z, je Bezirk Hauptlevel, dann Bonuslevel A–Z. */
export function buildAnalyticsLevelRankMap(
  districts: District[],
): Map<string, number> {
  const rankByKey = new Map<string, number>();
  const orderedDistricts = [...districts].sort((a, b) =>
    a.name.localeCompare(b.name, "de"),
  );

  let rank = 0;
  for (const district of orderedDistricts) {
    const primary = getPrimaryLevel(district);
    const bonuses = [...getBonusLevels(district)].sort((a, b) =>
      a.name.localeCompare(b.name, "de"),
    );

    if (primary) {
      for (const key of levelSortKeys(primary)) {
        rankByKey.set(key, rank);
      }
      rank += 1;
    }

    for (const bonus of bonuses) {
      for (const key of levelSortKeys(bonus)) {
        rankByKey.set(key, rank);
      }
      rank += 1;
    }
  }

  return rankByKey;
}

function resolveRank(
  rankByKey: Map<string, number>,
  levelSlug: string,
  districts: District[],
): number | undefined {
  const trimmed = levelSlug.trim();
  const direct = rankByKey.get(trimmed);
  if (direct != null) {
    return direct;
  }

  for (const district of districts) {
    for (const level of district.levels) {
      if (levelMatchesRouteParam(level, trimmed)) {
        for (const key of levelSortKeys(level)) {
          const rank = rankByKey.get(key);
          if (rank != null) {
            return rank;
          }
        }
      }
    }
  }

  return undefined;
}

function compareAnalyticsLevels(
  a: LevelSortRow,
  b: LevelSortRow,
  rankByKey: Map<string, number> | null,
  districts: District[] | null,
): number {
  if (rankByKey && districts?.length) {
    const rankA =
      resolveRank(rankByKey, a.levelSlug, districts) ?? UNKNOWN_RANK_BASE;
    const rankB =
      resolveRank(rankByKey, b.levelSlug, districts) ?? UNKNOWN_RANK_BASE;
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    if (rankA >= UNKNOWN_RANK_BASE && rankB >= UNKNOWN_RANK_BASE) {
      return a.levelTitle.localeCompare(b.levelTitle, "de");
    }
    return 0;
  }

  return a.levelTitle.localeCompare(b.levelTitle, "de");
}

export function sortAnalyticsLevelStarts<T extends LevelSortRow>(
  rows: T[],
  districts: District[] | null,
): T[] {
  const rankByKey =
    districts && districts.length > 0
      ? buildAnalyticsLevelRankMap(districts)
      : null;
  return [...rows].sort((a, b) =>
    compareAnalyticsLevels(a, b, rankByKey, districts),
  );
}

export function sortAnalyticsQuizRows<T extends LevelSortRow>(
  rows: T[],
  districts: District[] | null,
): T[] {
  return sortAnalyticsLevelStarts(rows, districts);
}
