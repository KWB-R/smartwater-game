import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import type { Level } from "@/features/level/types";
import { isLevelIntroLocationState } from "@/routes/level/navigation/levelIntroTypes";
import { missionDisplayTitle } from "@/features/level/logic/missionDisplayTitle";
import { readLevelPlayContext } from "@/features/level/session/levelPlayContext";

type UseLevelPlayLabelsOptions = {
  districtName?: string | null;
  missionTitle?: string | null;
};

export function useLevelPlayLabels(
  levelKey: string,
  level: Level,
  options?: UseLevelPlayLabelsOptions,
) {
  const location = useLocation();
  const introState = isLevelIntroLocationState(location.state)
    ? location.state
    : null;
  const levelPlayContext = useMemo(
    () => readLevelPlayContext(levelKey),
    [levelKey],
  );

  const districtName =
    introState?.district.name ??
    options?.districtName ??
    levelPlayContext?.districtName ??
    "";
  const missionLabel = missionDisplayTitle(
    options?.missionTitle,
    introState?.level.mission?.title,
    levelPlayContext?.missionTitle,
    introState?.level.name,
    levelPlayContext?.levelName,
    level.name,
  );

  return { districtName, missionLabel, introState };
}
