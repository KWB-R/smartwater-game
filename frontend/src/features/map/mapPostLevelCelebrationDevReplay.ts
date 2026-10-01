import {
  districtRouteId,
  findDistrictByRouteParam,
} from "@/features/map/berlinMapLayout";
import { createMapReturnFromShareLocationState } from "@/features/map/mapPostLevelCelebration";
import type { MapReturnFromShareLocationState } from "@/features/map/mapPostLevelCelebrationState";
import { stashMapReturnFromShareState } from "@/features/map/mapPostLevelCelebrationStorage";
import { levelProgressKey } from "@/features/level/levelProgress";
import {
  clearBonusLevelsRevealed,
  hasUnrevealedBonusLevels,
} from "@/features/map/mapBonusLevelUnlock";
import type { District } from "@/types/content";
import type { NavigateFunction } from "react-router-dom";
import { withoutViewTransition } from "@/lib/navigateWithViewTransition";
import { ROUTES } from "@/routes/paths";

type MapCelebrationDevReplayLocationState =
  MapReturnFromShareLocationState & {
    celebrationDevReplayNonce?: number;
  };

/** Letzter Bezirk für eine erneute Vorschau von /karte aus. */
let lastDevReplayDistrictRouteId: string | null = null;

export function readMapCelebrationDevReplayNonce(
  state: unknown,
): number {
  if (!import.meta.env.DEV) {
    return 0;
  }
  if (typeof state !== "object" || state === null) {
    return 0;
  }
  const raw = (state as MapCelebrationDevReplayLocationState)
    .celebrationDevReplayNonce;
  return typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
}

/**
 * Erstellt den vollständigen Abschlussablauf aus Detail, Sternen, Krone und Kartenintro.
 */
function buildMapCelebrationDevReplayState(
  district: District,
  levelStartKey: string,
): MapCelebrationDevReplayLocationState {
  const routeId = districtRouteId(district);
  const mapRevealBonus = hasUnrevealedBonusLevels(district);
  const state = createMapReturnFromShareLocationState({
    levelStartKey,
    districtRouteId: routeId,
    starCount: 3,
    bonusAfterDismiss: mapRevealBonus,
    mapDistrictWasUnhighlighted: true,
    mapDistrictNewlyFullySolved: true,
    mapRevealBonus,
    mapMarkerWasLevelMaxBeforeRun: true,
    detailPending: true,
  }) as MapCelebrationDevReplayLocationState;
  state.celebrationDevReplayNonce = Date.now();
  return state;
}

/** Vorschau des vollständigen Abschlussablaufs in der Entwicklung. */
export function triggerMapCelebrationDevReplay(params: {
  districts: District[];
  districtRouteId: string;
  navigate: NavigateFunction;
}): boolean {
  if (!import.meta.env.DEV) {
    return false;
  }
  const district = findDistrictByRouteParam(
    params.districts,
    params.districtRouteId,
  );
  if (!district) {
    return false;
  }
  const primary = district.levels.find((l) => l.primaryLevel !== false);
  const level = primary ?? district.levels[0];
  if (!level) {
    return false;
  }
  const levelStartKey = levelProgressKey(level);
  const routeId = districtRouteId(district);
  clearBonusLevelsRevealed(routeId);
  const state = buildMapCelebrationDevReplayState(district, levelStartKey);
  lastDevReplayDistrictRouteId = routeId;
  stashMapReturnFromShareState(state);
  params.navigate(
    ROUTES.map,
    withoutViewTransition({ replace: true, state }),
  );
  return true;
}

declare global {
  interface Window {
    /**
     * Konsolenhilfe für den Abschlussablauf.
     * Zunächst einen Bezirk öffnen, dann swgReplayMapCelebration() aufrufen.
     * Weitere Aufrufe sind von /karte aus möglich; der letzte Bezirk bleibt gespeichert.
     */
    swgReplayMapCelebration?: () => boolean;
  }
}

export function installMapCelebrationDevReplayGlobal(params: {
  districts: District[];
  districtRouteId: string | undefined;
  navigate: NavigateFunction;
}): () => void {
  if (!import.meta.env.DEV) {
    return () => {};
  }
  window.swgReplayMapCelebration = () => {
    const routeId =
      params.districtRouteId?.trim() ||
      lastDevReplayDistrictRouteId?.trim() ||
      "";
    if (!routeId) {
      console.warn(
        "[swg] Celebration-Replay: zuerst Bezirk öffnen (/karte/:bezirk), dann swgReplayMapCelebration()",
      );
      return false;
    }
    const ok = triggerMapCelebrationDevReplay({
      districts: params.districts,
      districtRouteId: routeId,
      navigate: params.navigate,
    });
    if (ok) {
      console.info(
        "[swg] Celebration-Replay: Detail (Sterne/Krone) → schließen → Map-Intro.",
      );
    }
    return ok;
  };
  return () => {
    delete window.swgReplayMapCelebration;
  };
}
