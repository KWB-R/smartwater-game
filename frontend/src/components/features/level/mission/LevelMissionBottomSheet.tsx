import { useMemo, type ReactNode } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { strapiImgCrossOrigin } from "@/api/strapiMediaImg";
import { useMissionBonusCatalog } from "@/features/level/hooks/useMissionBonusCatalog";
import { bonusRowsFromPuzzleItems } from "@/domain/levelBonusCategories";
import { puzzleItemsOrEmpty } from "@/api/mappers/enrichDistrictLevel";
import type { DistrictLevelSummary } from "@/types/content";
import { LevelMissionSheetContent } from "./LevelMissionSheetContent";

/** Missionsbild im Top-Slot — Overlap = halbe Höhe (über Sheet-Kante). */
const MISSION_SHEET_IMAGE_OVERLAP = "calc(7.5rem / 2)";

type LevelMissionBottomSheetProps = {
  level: DistrictLevelSummary;
  open: boolean;
  reducedMotion?: boolean;
  onBackdropClick?: () => void;
  onClosed?: () => void;
  footer: ReactNode;
};

export function LevelMissionBottomSheet({
  level,
  open,
  reducedMotion = false,
  onBackdropClick,
  onClosed,
  footer,
}: LevelMissionBottomSheetProps) {
  const mission = level.mission;
  const missionTitle = mission?.title ?? level.name ?? "Mission";
  const { catalog: missionBonusCatalog } = useMissionBonusCatalog();
  const bonusRows = useMemo(
    () => bonusRowsFromPuzzleItems(puzzleItemsOrEmpty(level)),
    [level],
  );

  const missionImageTopSlot =
    mission?.imageUrl != null ? (
      <img
        src={mission.imageUrl}
        alt={mission.imageAlt ?? ""}
        className="pointer-events-none block size-[7.5rem] rounded-full border-4 border-white bg-white object-cover shadow-[0_8px_24px_rgb(55_81_114/0.28)]"
        decoding="async"
        crossOrigin={strapiImgCrossOrigin(mission.imageUrl)}
      />
    ) : null;

  return (
    <BottomSheet
      open={open}
      size="fitContent"
      reducedMotion={reducedMotion}
      topSlot={missionImageTopSlot}
      topSlotOverlap={MISSION_SHEET_IMAGE_OVERLAP}
      sheetMaxHeight="100%"
      fitContentBodyMaxHeight="100%"
      labelledBy="mission-sheet-title"
      onBackdropClick={onBackdropClick}
      onClosed={onClosed}
      footer={footer}
    >
      <div className="px-4 pt-2 pb-3">
        <LevelMissionSheetContent
          missionTitle={missionTitle}
          mission={mission}
          bonusRows={bonusRows}
          missionBonusCatalog={missionBonusCatalog}
        />
      </div>
    </BottomSheet>
  );
}
