import type { District, DistrictLevelSummary } from "@/types/content";

export type LevelIntroLocationState = {
  district: District;
  level: DistrictLevelSummary;
  /** Die Spielroute zuerst einbinden; das Missions-Sheet wird darüber geschlossen. */
  missionSheetClosing?: boolean;
};

export function isLevelIntroLocationState(
  value: unknown,
): value is LevelIntroLocationState {
  if (!value || typeof value !== "object") {
    return false;
  }
  const v = value as LevelIntroLocationState;
  return (
    typeof v.district?.name === "string" &&
    typeof v.level?.name === "string" &&
    Array.isArray(v.district.levels)
  );
}
