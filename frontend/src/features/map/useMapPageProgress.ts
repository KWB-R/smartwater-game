import { useEffect, useMemo, useState } from "react";
import type { District } from "@/types/content";
import {
  subscribeLevelProgress,
  type LevelProgress,
} from "@/features/level/levelProgress";
import {
  countDistrictsWithLevels,
  countSolvedDistricts,
  readAllLevelProgressForDistricts,
} from "@/features/map/mapDistrictProgress";

export type MapPageProgress = {
  solvedDistricts: number;
  totalDistricts: number;
  progressByLevelKey: Map<string, LevelProgress | null>;
};

export function useMapPageProgress(districts: District[]): MapPageProgress {
  const [progressByLevelKey, setProgressByLevelKey] = useState(() =>
    readAllLevelProgressForDistricts(districts),
  );

  useEffect(() => {
    setProgressByLevelKey(readAllLevelProgressForDistricts(districts));
  }, [districts]);

  useEffect(
    () =>
      subscribeLevelProgress(() => {
        setProgressByLevelKey(readAllLevelProgressForDistricts(districts));
      }),
    [districts],
  );

  return useMemo(
    () => ({
      solvedDistricts: countSolvedDistricts(districts),
      totalDistricts: countDistrictsWithLevels(districts),
      progressByLevelKey,
    }),
    [districts, progressByLevelKey],
  );
}
