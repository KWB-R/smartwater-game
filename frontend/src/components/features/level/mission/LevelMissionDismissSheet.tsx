import type { DistrictLevelSummary } from "@/types/content";
import { buttonClassName } from "@/components/ui/Button";
import { LevelMissionBottomSheet } from "@/components/features/level/mission/LevelMissionBottomSheet";

type LevelMissionDismissSheetProps = {
  level: DistrictLevelSummary;
  open: boolean;
  reducedMotion: boolean;
  onClosed: () => void;
};

/**
 * Missions-Sheet beim Level-Einstieg (Dismiss-Variante): der Footer ist ein
 * unsichtbarer Platzhalter in Button-Maßen, damit das Sheet beim Ausblenden
 * nicht in der Höhe springt.
 */
export function LevelMissionDismissSheet({
  level,
  open,
  reducedMotion,
  onClosed,
}: LevelMissionDismissSheetProps) {
  return (
    <LevelMissionBottomSheet
      level={level}
      open={open}
      reducedMotion={reducedMotion}
      onClosed={onClosed}
      footer={
        <div
          className="pointer-events-none flex items-center gap-3 px-4 py-[0.85rem]"
          aria-hidden
        >
          <span
            className={buttonClassName({ shape: "roundIcon" }, "opacity-0")}
          />
          <span className={buttonClassName({ grow: true }, "opacity-0")}>
            Alles klar! Spielen!
          </span>
        </div>
      }
    />
  );
}
