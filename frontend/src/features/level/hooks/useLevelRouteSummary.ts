import { useMemo } from "react";

import { fetchLevelSummaryById } from "@/api/services/levelService";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { pickDistrictLevelSummary } from "@/api/mappers/enrichDistrictLevel";
import { levelMatchesRouteParam } from "@/features/level/levelProgress";
import type { LevelIntroLocationState } from "@/routes/level/navigation/levelIntroTypes";
import type { DistrictLevelSummary } from "@/types/content";

function levelFromIntroState(
  state: LevelIntroLocationState,
  levelIdParam: string | undefined,
): DistrictLevelSummary {
  const param = levelIdParam?.trim();
  if (param) {
    const match = state.district.levels.find((l) =>
      levelMatchesRouteParam(l, param),
    );
    if (match) {
      return match;
    }
  }
  return state.level;
}

/**
 * Lädt Leveldaten für Einstieg, Spiel, Quiz und Ergebnis.
 * Bis zur API-Antwort können bereits vorhandene Daten aus dem Router-Zustand angezeigt werden.
 */
export function useLevelRouteSummary(
  levelIdParam: string | undefined,
  introState: LevelIntroLocationState | null,
): {
  level: DistrictLevelSummary | null;
  status: "idle" | "loading" | "success" | "error";
  /** true während des API-Abrufs, auch wenn der Einstieg bereits Leveldaten mitgegeben hat. */
  levelDetailPending: boolean;
} {
  const routeId = levelIdParam?.trim() ?? "";
  const fetchId =
    routeId ||
    introState?.level.documentId ||
    (introState ? String(introState.level.id) : "");
  const shouldFetch = fetchId.length > 0;

  const resource = useAsyncResource(
    () => (shouldFetch ? fetchLevelSummaryById(fetchId) : Promise.resolve(null)),
    [fetchId, shouldFetch],
  );

  const apiLevel = resource.status === "success" ? resource.data : null;
  const level = useMemo(() => {
    const fromApi = apiLevel;
    const fromIntro = introState
      ? levelFromIntroState(introState, levelIdParam)
      : null;

    return pickDistrictLevelSummary(fromApi, fromIntro);
  }, [apiLevel, introState, levelIdParam]);

  const levelDetailPending = shouldFetch && resource.status === "loading";

  const status: "idle" | "loading" | "success" | "error" =
    levelDetailPending
      ? "loading"
      : resource.status === "error"
        ? "error"
        : level
          ? "success"
          : "idle";

  return { level, status, levelDetailPending };
}
