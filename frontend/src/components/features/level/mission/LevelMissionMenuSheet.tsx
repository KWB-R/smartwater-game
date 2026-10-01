import type { DistrictLevelSummary } from "@/types/content";
import { LevelMissionBottomSheet } from "@/components/features/level/mission/LevelMissionBottomSheet";
import { LevelMissionSheetCloseFooter } from "@/components/features/level/mission/LevelMissionSheetCloseFooter";

type LevelMissionMenuSheetProps = {
  level: DistrictLevelSummary;
  open: boolean;
  reducedMotion: boolean;
  onClose: () => void;
};

/** Missions-Sheet aus dem Hauptmenü (Backdrop + „schließen“-Footer). */
export function LevelMissionMenuSheet({
  level,
  open,
  reducedMotion,
  onClose,
}: LevelMissionMenuSheetProps) {
  return (
    <LevelMissionBottomSheet
      level={level}
      open={open}
      reducedMotion={reducedMotion}
      onBackdropClick={onClose}
      footer={<LevelMissionSheetCloseFooter onClose={onClose} />}
    />
  );
}
