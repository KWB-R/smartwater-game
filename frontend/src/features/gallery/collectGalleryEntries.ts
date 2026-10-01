import { getPrimaryLevel, isLevelVisibleOnMap } from "@/features/map/mapBonusLevelUnlock";
import {
  levelProgressKey,
  levelRouteSlug,
  readLevelProgress,
} from "@/features/level/levelProgress";
import { resolveLevelBackgroundImageUrl } from "@/features/level/gallery/resolveLevelBackgroundImageUrl";
import type { District, DistrictLevelSummary } from "@/types/content";

export type GalleryEntry = {
  /** Galerierouten verwenden den Level-Slug unter /gallerie/:levelKey. */
  levelKey: string;
  district: District;
  level: DistrictLevelSummary;
  districtName: string;
  levelLabel: string;
  isBonusLevel: boolean;
  isComplete: boolean;
  backgroundImageUrl: string | null;
};

function formatGalleryLabel(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return name;
  }
  return trimmed
    .toLocaleLowerCase("de-DE")
    .replace(/(^|[-\s/])(\S)/gu, (_, sep: string, ch: string) =>
      `${sep}${ch.toLocaleUpperCase("de-DE")}`,
    );
}

function pushLevelEntry(
  entries: GalleryEntry[],
  district: District,
  level: DistrictLevelSummary,
  isBonusLevel: boolean,
): void {
  const levelKey = levelRouteSlug(level);
  const progress = readLevelProgress(levelProgressKey(level));
  entries.push({
    levelKey,
    district,
    level,
    districtName: formatGalleryLabel(district.name),
    levelLabel: isBonusLevel
      ? formatGalleryLabel(level.name)
      : formatGalleryLabel(district.name),
    isBonusLevel,
    isComplete: progress?.completed === true,
    backgroundImageUrl: resolveLevelBackgroundImageUrl(district, level),
  });
}

export function collectGalleryEntries(districts: District[]): GalleryEntry[] {
  const entries: GalleryEntry[] = [];

  for (const district of districts) {
    const primary = getPrimaryLevel(district);
    if (primary) {
      pushLevelEntry(entries, district, primary, false);
    }
    for (const level of district.levels) {
      if (level.primaryLevel === false && isLevelVisibleOnMap(district, level)) {
        pushLevelEntry(entries, district, level, true);
      }
    }
  }

  entries.sort((a, b) => {
    const byDistrict = a.districtName.localeCompare(b.districtName, "de");
    if (byDistrict !== 0) {
      return byDistrict;
    }
    if (a.isBonusLevel === b.isBonusLevel) {
      return a.levelLabel.localeCompare(b.levelLabel, "de");
    }
    return a.isBonusLevel ? 1 : -1;
  });

  return entries;
}
