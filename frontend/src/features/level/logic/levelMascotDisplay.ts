import type { DistrictLevelSummary } from "@/types/content";
import {
  isPuzzleMaxBarScoreProgress,
  type LevelProgress,
} from "@/features/level/levelProgress";

/** Wählt je nach Abschlusszustand das traurige, glückliche oder besonders glückliche Maskottchen. */
export function getSelectedLevelMascotUrl(
  level: DistrictLevelSummary,
  progress: LevelProgress | null | undefined,
): string | null {
  if (progress?.completed) {
    if (isPuzzleMaxBarScoreProgress(progress) && level.superhappyMascotUrl) {
      return level.superhappyMascotUrl;
    }
    return (
      level.happyMascotUrl ??
      level.superhappyMascotUrl ??
      level.previewImageUrl
    );
  }
  return level.unhappyMascotUrl ?? level.previewImageUrl;
}

/** Alt-Text zum aktuell gewählten Maskottchen-Bild (Strapi `alternativeText`). */
export function getSelectedLevelMascotAlt(
  level: DistrictLevelSummary,
  progress: LevelProgress | null | undefined,
): string {
  if (progress?.completed) {
    if (isPuzzleMaxBarScoreProgress(progress) && level.superhappyMascotUrl) {
      return level.superhappyMascotAlt;
    }
    if (level.happyMascotUrl) {
      return level.happyMascotAlt;
    }
    if (level.superhappyMascotUrl) {
      return level.superhappyMascotAlt;
    }
    return level.previewImageAlt;
  }
  if (level.unhappyMascotUrl) {
    return level.unhappyMascotAlt;
  }
  return level.previewImageAlt;
}
