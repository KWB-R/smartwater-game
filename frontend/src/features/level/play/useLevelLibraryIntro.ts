import { useEffect, useMemo, useReducer } from "react";
import { useLatestRef } from "@/hooks/useLatestRef";
import type { DistrictLevelPuzzleItem } from "@/types/content";
import type { Tile } from "@/features/level/types";
import {
  orderTilesForLibraryStrip,
  runAfterLibraryStripScrollSettled,
  scheduleScrollLibraryStripToTile,
} from "@/features/level/logic/levelPageUtils";
import {
  createInitialLibraryIntroState,
  libraryIntroReducer,
} from "@/features/level/play/libraryIntroState";

const LIBRARY_INTRO_FIRST_TILE_DELAY_MS = 220;
const LIBRARY_INTRO_TILE_STAGGER_MS = 340;
const LIBRARY_INTRO_TILE_ANIM_MS = 560;

type UseLevelLibraryIntroArgs = {
  availableTiles: Tile[];
  puzzleItems: ReadonlyArray<DistrictLevelPuzzleItem>;
  placedTilesLength: number;
  libraryStripLoading: boolean;
  boardSceneReady: boolean;
  playSurfaceReady: boolean;
  reducedMotion: boolean;
  /** Wird beim Neustart erhöht, damit das Intro auf derselben Route erneut laufen kann. */
  libraryIntroRunId: number;
  /** Schlüssel aus Levelroute und Neustartzähler; CMS-Aktualisierungen starten das Intro nicht neu. */
  levelSyncKey: string;
};

export type UseLevelLibraryIntroResult = {
  stripTiles: Tile[];
  libraryIntroActive: boolean;
  libraryIntroEnterTileIds: ReadonlySet<number>;
  libraryIntroSettled: boolean;
  /** Platzhalter bis zum Einflug des ersten Teils zeigen. */
  libraryStripIntroLoading: boolean;
};

/**
 * Lässt die Puzzleteile nacheinander in die Bibliothek einfliegen.
 * Der Reducer verwaltet den Zustand; dieser Hook steuert Timer und Scrollen.
 */
export function useLevelLibraryIntro({
  availableTiles,
  puzzleItems,
  placedTilesLength,
  libraryStripLoading,
  boardSceneReady,
  playSurfaceReady,
  reducedMotion,
  libraryIntroRunId,
  levelSyncKey,
}: UseLevelLibraryIntroArgs): UseLevelLibraryIntroResult {
  const orderedTiles = useMemo(
    () => orderTilesForLibraryStrip(availableTiles, puzzleItems),
    [availableTiles, puzzleItems],
  );
  const orderedTilesRef = useLatestRef(orderedTiles);

  const orderedStripKey = useMemo(
    () => orderedTiles.map((t) => t.id).join(","),
    [orderedTiles],
  );

  const [state, dispatch] = useReducer(
    libraryIntroReducer,
    null,
    createInitialLibraryIntroState,
  );
  const { phase, visibleCount, enterTileIds, settled, settleMode } = state;

  // Beim Levelwechsel oder Neustart das Intro erneut freigeben.
  useEffect(() => {
    dispatch({ type: "reset" });
  }, [levelSyncKey, libraryIntroRunId]);

  const canRunIntro =
    !libraryStripLoading &&
    boardSceneReady &&
    playSurfaceReady &&
    placedTilesLength === 0 &&
    orderedTiles.length > 0;

  // Das Intro einmal pro Level starten. Bei reduzierten Animationen oder einer gespeicherten Sitzung
  // mit bereits platzierten Teilen sofort abschließen.
  useEffect(() => {
    if (phase === "done") {
      dispatch({ type: "tilesSynced", tileCount: orderedTiles.length });
      return;
    }
    if (!canRunIntro) {
      if (placedTilesLength > 0 && orderedTiles.length > 0) {
        dispatch({
          type: "completedImmediately",
          tileCount: orderedTiles.length,
        });
      }
      return;
    }
    if (reducedMotion) {
      dispatch({
        type: "completedImmediately",
        tileCount: orderedTiles.length,
      });
      return;
    }
    dispatch({ type: "started" });
  }, [
    canRunIntro,
    reducedMotion,
    phase,
    placedTilesLength,
    orderedTiles.length,
    orderedStripKey,
  ]);

  // Pro Timerschritt ein Teil einblenden und dorthin scrollen.
  useEffect(() => {
    if (phase !== "running") {
      return;
    }
    const delay =
      visibleCount === 0
        ? LIBRARY_INTRO_FIRST_TILE_DELAY_MS
        : LIBRARY_INTRO_TILE_STAGGER_MS;
    const timer = window.setTimeout(() => {
      const tiles = orderedTilesRef.current;
      const tile = tiles[visibleCount];
      if (tile) {
        scheduleScrollLibraryStripToTile(
          tile.id,
          reducedMotion ? "auto" : "smooth",
        );
      }
      dispatch({
        type: "tileRevealed",
        tileId: tile?.id ?? null,
        tileCount: tiles.length,
      });
    }, delay);
    return () => {
      window.clearTimeout(timer);
    };
  }, [phase, visibleCount, reducedMotion, orderedStripKey, orderedTilesRef]);

  // Die Hervorhebung nach der Einblendung entfernen.
  const enterTileKey = useMemo(
    () => [...enterTileIds].join(","),
    [enterTileIds],
  );
  useEffect(() => {
    if (enterTileKey === "") {
      return;
    }
    const timer = window.setTimeout(() => {
      dispatch({ type: "enterHighlightCleared" });
    }, LIBRARY_INTRO_TILE_ANIM_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [enterTileKey]);

  // Nach der letzten Einblendung abschließen; bei mehreren Teilen zuvor zum ersten Teil zurückscrollen.

  useEffect(() => {
    if (phase !== "done" || settled) {
      return;
    }
    if (settleMode === "immediate") {
      dispatch({ type: "settled" });
      return;
    }
    let scrollWatchCleanup: (() => void) | null = null;
    const timer = window.setTimeout(() => {
      if (settleMode === "afterAnim") {
        dispatch({ type: "settled" });
        return;
      }
      const firstTile = orderedTilesRef.current[0];
      if (!firstTile) {
        dispatch({ type: "settled" });
        return;
      }
      scrollWatchCleanup = runAfterLibraryStripScrollSettled(
        firstTile.id,
        reducedMotion ? "auto" : "smooth",
        () => {
          scrollWatchCleanup = null;
          dispatch({ type: "settled" });
        },
      );
    }, LIBRARY_INTRO_TILE_ANIM_MS);
    return () => {
      window.clearTimeout(timer);
      scrollWatchCleanup?.();
    };
  }, [phase, settled, settleMode, reducedMotion, orderedTilesRef]);

  const stripTiles = useMemo(() => {
    if (phase === "done") {
      return orderedTiles;
    }
    if (phase === "running") {
      return orderedTiles.slice(0, visibleCount);
    }
    // Im Anfangszustand keine Teile zeigen, damit sie vor dem Einflug nicht kurz aufblitzen.
    return [];
  }, [phase, orderedTiles, visibleCount]);

  const libraryIntroActive = phase === "running";

  const libraryStripIntroLoading =
    phase !== "done" &&
    visibleCount === 0 &&
    orderedTiles.length > 0 &&
    !libraryStripLoading;

  return {
    stripTiles,
    libraryIntroActive,
    libraryIntroSettled: settled,
    libraryIntroEnterTileIds: enterTileIds,
    libraryStripIntroLoading,
  };
}
