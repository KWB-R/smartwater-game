import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useLatestRef } from "@/hooks/useLatestRef";

import {
  ensureLevelPackagePreload,
  getLevelAssetPreloadSnapshot,
  LEVEL_ASSET_PRELOAD_IDLE_SNAPSHOT,
  subscribeLevelAssetPreload,
} from "@/features/level/services/levelAssetPreloadSession";
import { resolveLevelAssetsFolder } from "@/features/level/services/resolveLevelAssetsFolder";
import type { LevelIntroLocationState } from "@/routes/level/navigation/levelIntroTypes";
import { useLevelRouteSummary } from "@/features/level/hooks/useLevelRouteSummary";

export function useLevelAssetPreload(
  levelKey: string | null,
  introState: LevelIntroLocationState | null,
  levelIdParam: string | undefined,
): {
  ready: boolean;
  progress: number;
  loaded: number;
  total: number;
  status: "idle" | "loading" | "done" | "error";
} {
  const { level: cmsLevel } = useLevelRouteSummary(levelIdParam, introState);
  const cmsLevelRef = useLatestRef(cmsLevel);

  const routeLevelId = levelIdParam?.trim() ?? "";
  const fetchId =
    routeLevelId ||
    introState?.level.documentId ||
    (introState ? String(introState.level.id) : "");

  const fallbackLevelRef = useLatestRef(introState?.level ?? cmsLevel ?? null);
  const resolvedAssetsFolder = useMemo(
    () =>
      resolveLevelAssetsFolder(
        introState?.district ?? null,
        cmsLevel ?? introState?.level ?? null,
      ),
    [introState?.district, introState?.level, cmsLevel],
  );

  const districtBezirkId = introState?.district?.bezirkId ?? "";

  useEffect(() => {
    if (!levelKey || !fetchId) {
      return;
    }
    ensureLevelPackagePreload(levelKey, {
      levelId: fetchId,
      levelKey,
      district: introState?.district ?? null,
      fallbackLevel: fallbackLevelRef.current ?? cmsLevelRef.current ?? null,
      assetsFolder: resolvedAssetsFolder || undefined,
    });
  }, [levelKey, fetchId, districtBezirkId, resolvedAssetsFolder, introState?.district, fallbackLevelRef, cmsLevelRef]);

  const snapshot = useSyncExternalStore(
    subscribeLevelAssetPreload,
    () =>
      levelKey
        ? getLevelAssetPreloadSnapshot(levelKey)
        : LEVEL_ASSET_PRELOAD_IDLE_SNAPSHOT,
    () => LEVEL_ASSET_PRELOAD_IDLE_SNAPSHOT,
  );

  // Den Wert aus dem abonnierten Snapshot lesen, damit React Änderungen am Store erkennt.
  // Ein direkter Store-Aufruf im Render würde diese Abhängigkeit umgehen.
  const progress =
    snapshot.total <= 0 ? 1 : Math.min(1, snapshot.loaded / snapshot.total);
  return {
    ready: levelKey ? snapshot.status === "done" : true,
    progress: levelKey ? progress : 1,
    loaded: snapshot.loaded,
    total: snapshot.total,
    status: levelKey ? snapshot.status : "idle",
  };
}
