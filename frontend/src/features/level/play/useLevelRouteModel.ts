import { useEffect, useMemo, useRef } from "react";
import { useLocation, useParams } from "react-router-dom";
import {
  parseCmsMaxPuzzleItems,
  puzzleItemsOrEmpty,
  placementOrderOrEmpty,
} from "@/api/mappers/enrichDistrictLevel";
import { useLevelPlayLabels } from "@/components/features/level/play/useLevelPlayLabels";
import { districtRouteId } from "@/features/map/berlinMapLayout";
import { useLevelAssetPreload } from "@/features/level/hooks/useLevelAssetPreload";
import { useLevelBundle } from "@/features/level/hooks/useLevelBundle";
import { useLevelPlayAssetsContext } from "@/features/level/hooks/useLevelPlayAssetsContext";
import { useLevelRouteSummary } from "@/features/level/hooks/useLevelRouteSummary";
import { applyPuzzleItemsToLevel } from "@/features/level/logic/applyPuzzleItemsToLevel";
import { getInitialAvailableTiles } from "@/features/level/logic/levelPageUtils";
import { activeMissionGoalDimensions } from "@/features/level/logic/tileCategoryPoints";
import { levelProgressKey } from "@/features/level/levelProgress";
import { persistLevelPlayContext } from "@/features/level/session/levelPlayContext";
import {
  isLevelIntroLocationState,
  type LevelIntroLocationState,
} from "@/routes/level/navigation/levelIntroTypes";
import type { District, DistrictLevelSummary } from "@/types/content";
import type { GoalFocusDimension, Level } from "@/features/level/types";
import type { MutableRefObject } from "react";
import type { LevelBundle } from "@/features/level/services/loadLevelBundle";

export type LevelRouteModel = {
  levelIdParam: string | undefined;
  introState: LevelIntroLocationState | null;
  cmsLevel: DistrictLevelSummary | null | undefined;
  cmsLevelStatus: string;
  levelPlayAssets: ReturnType<typeof useLevelPlayAssetsContext>;
  levelBundle: LevelBundle;
  missionLevelSummary: DistrictLevelSummary | null;
  endAnimation: LevelBundle["endAnimation"];
  endAnimations: LevelBundle["endAnimations"];
  levelKey: string;
  puzzleItems: ReturnType<typeof puzzleItemsOrEmpty>;
  placementOrder: ReturnType<typeof placementOrderOrEmpty>;
  level: Level;
  cappedLevel: Level;
  missionGoalDimensions: ReadonlySet<GoalFocusDimension>;
  districtName: string;
  missionLabel: string;
  assetPreload: ReturnType<typeof useLevelAssetPreload>;
  libraryStripReady: boolean;
  postLevelDistrictRef: MutableRefObject<District | null>;
  postLevelDistrictRouteIdRef: MutableRefObject<string | null>;
};

/**
 * Bereitet CMS-Daten, Medienpaket, Puzzlelimit, Beschriftungen und Kartenreferenzen für die Spielsitzung vor.
 */
export function useLevelRouteModel(): LevelRouteModel {
  const { levelId: levelIdParam } = useParams();
  const location = useLocation();
  const introState = useMemo(() => {
    const state = location.state;
    return isLevelIntroLocationState(state) ? state : null;
  }, [location.state]);
  const postLevelDistrictRef = useRef<District | null>(null);
  const postLevelDistrictRouteIdRef = useRef<string | null>(null);

  const { level: cmsLevel, status: cmsLevelStatus } = useLevelRouteSummary(
    levelIdParam,
    introState,
  );
  const levelPlayAssets = useLevelPlayAssetsContext({
    introDistrict: introState?.district,
    cmsLevel,
    introLevel: introState?.level,
  });
  const levelBundle = useLevelBundle({
    district: levelPlayAssets.district,
    level: levelPlayAssets.level,
  });
  const missionLevelSummary = cmsLevel ?? introState?.level ?? null;
  const { endAnimation, endAnimations } = levelBundle;
  const levelKey =
    cmsLevel != null
      ? levelProgressKey(cmsLevel)
      : (levelIdParam ?? String(levelBundle.level.id));

  useEffect(() => {
    const district =
      introState?.district ?? levelPlayAssets.district ?? null;
    const levelSummary = cmsLevel ?? introState?.level ?? null;
    if (!district || !levelSummary) {
      return;
    }
    postLevelDistrictRef.current = district;
    const routeId = districtRouteId(district);
    postLevelDistrictRouteIdRef.current = routeId;
    persistLevelPlayContext(levelKey, {
      districtName: district.name,
      levelName: levelSummary.name,
      districtRouteId: routeId,
      missionTitle:
        introState?.level.mission?.title ??
        levelSummary.mission?.title ??
        undefined,
    });
  }, [introState, cmsLevel, levelKey, levelPlayAssets.district]);

  const puzzleItems = useMemo(() => {
    const fromCms = cmsLevel ? puzzleItemsOrEmpty(cmsLevel) : [];
    if (fromCms.length > 0) {
      return fromCms;
    }
    return introState?.level ? puzzleItemsOrEmpty(introState.level) : [];
  }, [cmsLevel, introState?.level]);
  const placementOrder = useMemo(() => {
    if (cmsLevel) {
      return placementOrderOrEmpty(cmsLevel);
    }
    return introState?.level ? placementOrderOrEmpty(introState.level) : [];
  }, [cmsLevel, introState?.level]);
  const level = useMemo(
    () => applyPuzzleItemsToLevel(levelBundle.level, puzzleItems),
    [levelBundle.level, puzzleItems],
  );

  const cappedLevel = useMemo(() => {
    const cmsCap = parseCmsMaxPuzzleItems(cmsLevel?.maxPuzzleItems);
    if (cmsCap == null) {
      return level;
    }
    return {
      ...level,
      maximumTileCount: cmsCap,
    };
  }, [cmsLevel?.maxPuzzleItems, level]);

  const missionGoalDimensions = useMemo(
    () => activeMissionGoalDimensions(puzzleItems, cappedLevel),
    [puzzleItems, cappedLevel],
  );
  const { districtName, missionLabel } = useLevelPlayLabels(levelKey, level, {
    districtName: levelPlayAssets.district?.name,
    missionTitle: cmsLevel?.mission?.title,
  });

  const assetPreload = useLevelAssetPreload(levelKey, introState, levelIdParam);
  const libraryStripReady = useMemo(
    () => getInitialAvailableTiles(cappedLevel, puzzleItems).length > 0,
    [cappedLevel, puzzleItems],
  );

  return {
    levelIdParam,
    introState,
    cmsLevel,
    cmsLevelStatus,
    levelPlayAssets,
    levelBundle,
    missionLevelSummary,
    endAnimation,
    endAnimations,
    levelKey,
    puzzleItems,
    placementOrder,
    level,
    cappedLevel,
    missionGoalDimensions,
    districtName,
    missionLabel,
    assetPreload,
    libraryStripReady,
    postLevelDistrictRef,
    postLevelDistrictRouteIdRef,
  };
}
