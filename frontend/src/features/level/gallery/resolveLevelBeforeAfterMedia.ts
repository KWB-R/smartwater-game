import type { LevelEndAnimationSpec } from "@/features/level/mappers/levelFromConfig";
import { resolveGalleryComboUrls } from "@/features/level/gallery/resolveGalleryComboUrls";
import {
  resolveLevelBackgroundImageUrl,
  resolvePlayLevelBackgroundImageUrl,
} from "@/features/level/gallery/resolveLevelBackgroundImageUrl";
import type { District, DistrictLevelSummary } from "@/types/content";

export type LevelBeforeAfterMedia = {
  backgroundImageUrl: string | null;
  finishedImageUrl: string | null;
  videoUrl: string | null;
};

export function resolveLevelBeforeAfterMedia(options: {
  district: District | undefined;
  level: DistrictLevelSummary | null;
  playLevelBackgroundUrl?: string | null;
  assetsFolder: string | null | undefined;
  partIds: ReadonlyArray<string>;
  endAnimation?: LevelEndAnimationSpec | null;
}): LevelBeforeAfterMedia {
  const backgroundImageUrl =
    resolveLevelBackgroundImageUrl(options.district ?? null, options.level) ??
    resolvePlayLevelBackgroundImageUrl(options.playLevelBackgroundUrl);
  const combo = resolveGalleryComboUrls({
    assetsFolder: options.assetsFolder,
    partIds: options.partIds,
    endAnimation: options.endAnimation,
  });
  return {
    backgroundImageUrl,
    finishedImageUrl: combo.finishedImageUrl,
    videoUrl: combo.videoUrl,
  };
}
