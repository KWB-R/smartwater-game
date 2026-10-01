import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { districtRouteId } from "@/features/map/berlinMapLayout";
import { createMapZoomOutLocationState } from "@/features/map/mapZoomOutNavigation";
import { ROUTES } from "@/routes/paths";
import { Button } from "@/components/ui/Button";
import type { LevelIntroLocationState } from "@/routes/level/navigation/levelIntroTypes";
import { persistLevelPlayContext } from "@/features/level/session/levelPlayContext";
import { missionDisplayTitle } from "@/features/level/logic/missionDisplayTitle";
import { ArrowIcon } from "@/internal_assets/icons/ArrowIcon";
import { useLevelBundle } from "@/features/level/hooks/useLevelBundle";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { LevelAssetPreloadBar } from "@/components/features/level/LevelAssetPreloadBar";
import { useLevelAssetPreload } from "@/features/level/hooks/useLevelAssetPreload";
import {
  LEVEL_SESSION_CLEAR_PLAY_BOARD_OVERLAYS,
  type LevelSessionChromePatch,
} from "@/components/features/level/session/levelSessionChromeContext";
import { LevelMissionBottomSheet } from "@/components/features/level/mission/LevelMissionBottomSheet";
import type { DistrictLevelSummary } from "@/types/content";
import { goToLevelPhase } from "@/routes/level/navigation/levelPlayNavigate";
import { LEVEL_PLAY_PHASE } from "@/routes/level/navigation/levelPlayPhase";

type UseLevelMissionPhaseArgs = {
  enabled: boolean;
  state: LevelIntroLocationState | null;
  levelId: string;
  level: DistrictLevelSummary | null;
};

export function useLevelMissionPhase({
  enabled,
  state,
  levelId,
  level,
}: UseLevelMissionPhaseArgs): {
  chromePatch: LevelSessionChromePatch | null;
  chromeSyncKey: string | null;
} {
  const navigate = useNavigate();
  const district = state?.district;
  const levelKey =
    level != null ? (level.documentId ?? String(level.id)) : "";
  const navigationState = useMemo((): LevelIntroLocationState | null => {
    if (!state?.district || !level) {
      return null;
    }
    return { district: state.district, level };
  }, [state?.district, level]);
  const assetPreload = useLevelAssetPreload(
    enabled ? levelKey : null,
    enabled ? state : null,
    enabled ? levelId : undefined,
  );
  useLevelBundle({
    district: district ?? null,
    level: level ?? null,
  });
  const reducedMotion = usePrefersReducedMotion();
  const [missionSheetOpen, setMissionSheetOpen] = useState(enabled);
  const pendingNavRef = useRef<"map" | "play" | null>(null);
  const districtRoute = district ? districtRouteId(district) : "";

  useEffect(() => {
    if (!enabled) {
      return;
    }
    setMissionSheetOpen(true);
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !district || !level) {
      return;
    }
    persistLevelPlayContext(levelKey, {
      districtName: district.name,
      levelName: level.name,
      districtRouteId: districtRoute,
      missionTitle: missionDisplayTitle(level.mission?.title, level.name),
    });
  }, [enabled, district, level, levelKey]);

  const requestCloseMissionSheet = useCallback((target: "map" | "play") => {
    pendingNavRef.current = target;
    setMissionSheetOpen(false);
  }, []);

  const closeMission = useCallback(() => {
    requestCloseMissionSheet("map");
  }, [requestCloseMissionSheet]);

  const startPlay = useCallback(() => {
    if (!navigationState) {
      return;
    }
    goToLevelPhase(navigate, levelId, LEVEL_PLAY_PHASE.placing, {
      replace: false,
      state: {
        ...navigationState,
        missionSheetClosing: true,
      },
    });
  }, [navigate, navigationState, levelId]);

  const handleMissionSheetClosed = useCallback(() => {
    const target = pendingNavRef.current;
    pendingNavRef.current = null;
    if (target === "map") {
      navigate(ROUTES.map, {
        replace: true,
        state: createMapZoomOutLocationState(districtRoute),
      });
    }
  }, [navigate, districtRoute]);

  const missionSheetFooter = useMemo(
    () => (
      <div className="flex items-center gap-3 px-4 py-[0.85rem]">
        <Button
          shape="roundIcon"
          aria-label="Zurück zur Karte"
          onClick={closeMission}
        >
          <ArrowIcon />
        </Button>
        <Button grow onClick={startPlay}>
          Alles klar! Spielen!
        </Button>
      </div>
    ),
    [closeMission, startPlay],
  );

  const missionSheet = useMemo(
    () =>
      enabled && level ? (
        <LevelMissionBottomSheet
          level={level}
          open={missionSheetOpen}
          reducedMotion={reducedMotion}
          onBackdropClick={closeMission}
          onClosed={handleMissionSheetClosed}
          footer={missionSheetFooter}
        />
      ) : null,
    [
      enabled,
      level,
      missionSheetOpen,
      reducedMotion,
      closeMission,
      handleMissionSheetClosed,
      missionSheetFooter,
    ],
  );

  const chromePatch = useMemo((): LevelSessionChromePatch | null => {
    if (!enabled || !district || !level) {
      return null;
    }
    return {
      ...LEVEL_SESSION_CLEAR_PLAY_BOARD_OVERLAYS,
      header: null,
      topBar: (
        <LevelAssetPreloadBar
          progress={assetPreload.progress}
          visible={!assetPreload.ready && assetPreload.total > 0}
        />
      ),
      boardOverlay: null,
      boardSceneStack: missionSheet,
      sceneClassName: "level-scene--mission-sheet",
      shellVariant: "play",
      boardPointerEnabled: false,
      boardAriaLabel: "Level-Hintergrund",
      boardRole: "img",
      dock: null,
    };
  }, [
    enabled,
    district,
    level,
    assetPreload.progress,
    assetPreload.ready,
    assetPreload.total,
    missionSheet,
  ]);

  const chromeSyncKey = useMemo(() => {
    if (!enabled || !district || !level) {
      return null;
    }
    return [
      "mission",
      district.name,
      String(assetPreload.progress),
      assetPreload.ready ? "1" : "0",
      String(assetPreload.total),
      missionSheetOpen ? "1" : "0",
    ].join("|");
  }, [
    enabled,
    district,
    level,
    assetPreload.progress,
    assetPreload.ready,
    assetPreload.total,
    missionSheetOpen,
  ]);

  return { chromePatch, chromeSyncKey };
}
