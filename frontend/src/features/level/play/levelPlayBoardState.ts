import type { Dispatch } from "react";
import type { DistrictLevelPuzzleItem } from "@/types/content";
import type {
  GoalFocusDimension,
  Level,
  PointMatrix,
  Tile,
} from "@/features/level/types";
import type { PlacedTile } from "@/features/level/logic/levelState";
import { addPoints, emptyPoints } from "@/features/level/logic/points";
import {
  findTileById,
  getInitialAvailableTiles,
  orderTilesForLibraryStrip,
} from "@/features/level/logic/levelPageUtils";

/**
 * Zentraler Brettzustand im Reducer.
 * Sounds, Timer, Szenenaktualisierung und Ref-Zugriffe bleiben als Seiteneffekte in den Ablauf-Hooks.
 */
export type LevelPlayBoardState = {
  placedTiles: PlacedTile[];
  availableTiles: Tile[];
  levelPoints: PointMatrix;
  /** base enthält das CMS-Limit; count die aktuell freigeschaltete Zahl an Platzierungen. */
  maxTileCount: { base: number; count: number };
  /**
   * Zwischenwert während der Punkteanimation.
   * Bei null zeigt der Balken den berechneten Ruhewert aus useLevelScoringModel.
   */
  barScoreAnimationOverride: number | null;
  barScoreGainLabel: string | null;
  secondaryRewardToast: string | null;
  placementRewardBlocking: boolean;
  draggingTileId: number | null;
  comboDialogOpen: boolean;
  comboDialogTile: Tile | null;
  hiddenComboTileIds: ReadonlySet<number>;
  comboRevealReservedTileIds: ReadonlySet<number>;
  comboRevealPopTileIds: ReadonlySet<number>;
};

export type PlacementCommittedPayload = {
  tile: Tile;
  /** Platzierte Teile einschließlich der neuen Platzierung, in derselben Reihenfolge wie in der Szene. */
  nextPlacedTiles: PlacedTile[];
  /** Missionspunktmatrix des neu platzierten Teils. */
  pointMatrix: PointMatrix;
  missionGoalDimensions: ReadonlySet<GoalFocusDimension>;
  hasSocket: boolean;
  /** cappedLevel.maximumTileCount begrenzt die Freischaltung zusätzlicher Plätze. */
  maxTileCountCap: number;
  showComboAfterPlacement: boolean;
  puzzleCompletesWithPlacement: boolean;
  /** Freizuschaltende Kombiteile, wenn showComboAfterPlacement gesetzt ist. */
  pendingComboTiles: Tile[];
  puzzleItems: ReadonlyArray<DistrictLevelPuzzleItem>;
  hasBarReward: boolean;
  prevWeighted: number;
};

export type LevelPlayBoardAction =
  | {
      type: "levelRestarted";
      cappedLevel: Level;
      puzzleItems: ReadonlyArray<DistrictLevelPuzzleItem>;
    }
  | {
      type: "sessionRestored";
      placedTiles: PlacedTile[];
      levelPoints: PointMatrix;
      maxTileCount: number;
    }
  | { type: "maxTileCountBaseChanged"; base: number }
  | { type: "placedTilesRefreshed"; level: Level }
  | { type: "librarySynced"; availableTiles: Tile[] }
  | ({ type: "placementCommitted" } & PlacementCommittedPayload)
  | {
      type: "comboTilesRevealed";
      pendingTiles: Tile[];
      puzzleItems: ReadonlyArray<DistrictLevelPuzzleItem>;
    }
  | { type: "comboRevealTilesShown"; tileIds: number[] }
  | { type: "comboRevealPopSet"; tileIds: number[] }
  | { type: "comboRevealFinished" }
  | { type: "comboStateReset" }
  | { type: "comboDialogOpenSet"; open: boolean }
  | { type: "comboDialogOpened" }
  | { type: "comboDialogDismissed" }
  | { type: "rewardBlockingSet"; blocking: boolean }
  | { type: "barScoreAnimationSet"; value: number | null }
  | { type: "gainLabelSet"; label: string | null }
  | { type: "toastSet"; toast: string | null }
  | { type: "draggingTileSet"; tileId: number | null };

export type LevelPlayBoardDispatch = Dispatch<LevelPlayBoardAction>;

const EMPTY_ID_SET: ReadonlySet<number> = new Set<number>();

export function createInitialLevelPlayBoardState(
  cappedLevel: Level,
): LevelPlayBoardState {
  return {
    placedTiles: [],
    availableTiles: [],
    levelPoints: emptyPoints(),
    maxTileCount: {
      base: cappedLevel.maximumTileCount,
      count: Math.max(1, cappedLevel.maximumTileCount),
    },
    barScoreAnimationOverride: null,
    barScoreGainLabel: null,
    secondaryRewardToast: null,
    placementRewardBlocking: false,
    draggingTileId: null,
    comboDialogOpen: false,
    comboDialogTile: null,
    hiddenComboTileIds: EMPTY_ID_SET,
    comboRevealReservedTileIds: EMPTY_ID_SET,
    comboRevealPopTileIds: EMPTY_ID_SET,
  };
}

export function levelPlayBoardReducer(
  state: LevelPlayBoardState,
  action: LevelPlayBoardAction,
): LevelPlayBoardState {
  switch (action.type) {
    case "levelRestarted": {
      const max = action.cappedLevel.maximumTileCount;
      return {
        ...createInitialLevelPlayBoardState(action.cappedLevel),
        maxTileCount: { base: max, count: max },
        availableTiles: getInitialAvailableTiles(
          action.cappedLevel,
          action.puzzleItems,
        ),
      };
    }
    case "sessionRestored":
      return {
        ...state,
        placedTiles: action.placedTiles,
        levelPoints: action.levelPoints,
        maxTileCount: {
          base: state.maxTileCount.base,
          count: action.maxTileCount,
        },
      };
    case "maxTileCountBaseChanged":
      return {
        ...state,
        maxTileCount: {
          base: action.base,
          count: Math.max(1, action.base),
        },
      };
    case "placedTilesRefreshed":
      return {
        ...state,
        placedTiles: state.placedTiles.map((p) => {
          const fresh = findTileById(action.level, p.tile.id);
          return fresh ? { ...p, tile: { ...fresh, placed: true } } : p;
        }),
      };
    case "librarySynced":
      return { ...state, availableTiles: action.availableTiles };
    case "placementCommitted": {
      const next = { ...state };
      if (action.hasBarReward || action.showComboAfterPlacement) {
        next.placementRewardBlocking = true;
      }
      if (action.hasBarReward) {
        // Den Balken zunächst auf dem bisherigen Punktestand halten; die Timer erhöhen ihn
        // und geben am Ende wieder den berechneten Ruhewert frei.
        next.barScoreAnimationOverride = action.prevWeighted;
      }
      if (action.puzzleCompletesWithPlacement) {
        next.comboDialogOpen = false;
        next.comboDialogTile = null;
      }
      next.placedTiles = action.nextPlacedTiles;
      next.levelPoints = addPoints(
        state.levelPoints,
        action.pointMatrix,
        action.missionGoalDimensions,
      );
      if (action.hasSocket) {
        next.maxTileCount = {
          base: state.maxTileCount.base,
          count: Math.min(
            action.maxTileCountCap,
            state.maxTileCount.count + 1,
          ),
        };
      }
      const inLibrary = state.availableTiles.some(
        (t) => t.id === action.tile.id,
      );
      if (inLibrary) {
        if (
          action.showComboAfterPlacement &&
          action.pendingComboTiles.length > 0
        ) {
          next.comboDialogTile = action.pendingComboTiles[0] ?? null;
        }
        next.availableTiles = orderTilesForLibraryStrip(
          state.availableTiles.map((t) =>
            t.id === action.tile.id ? { ...t, placed: true } : t,
          ),
          action.puzzleItems,
        );
      }
      return next;
    }
    case "comboTilesRevealed": {
      const next = {
        ...state,
        comboDialogTile: null,
        placementRewardBlocking: false,
      };
      if (action.pendingTiles.length > 0) {
        const seen = new Set(state.availableTiles.map((t) => t.id));
        const merged = [...state.availableTiles];
        for (const t of action.pendingTiles) {
          if (!seen.has(t.id)) {
            merged.push(t);
            seen.add(t.id);
          }
        }
        next.availableTiles = orderTilesForLibraryStrip(
          merged,
          action.puzzleItems,
        );
      }
      return next;
    }
    case "comboRevealTilesShown":
      return {
        ...state,
        comboRevealReservedTileIds: EMPTY_ID_SET,
        hiddenComboTileIds: EMPTY_ID_SET,
        comboRevealPopTileIds: new Set(action.tileIds),
      };
    case "comboRevealPopSet":
      return {
        ...state,
        comboRevealPopTileIds: new Set(action.tileIds),
      };
    case "comboRevealFinished":
      return {
        ...state,
        comboRevealReservedTileIds: EMPTY_ID_SET,
        hiddenComboTileIds: EMPTY_ID_SET,
        comboRevealPopTileIds: EMPTY_ID_SET,
        placementRewardBlocking: false,
      };
    case "comboStateReset":
      return {
        ...state,
        comboDialogTile: null,
        hiddenComboTileIds: EMPTY_ID_SET,
        comboRevealReservedTileIds: EMPTY_ID_SET,
        comboRevealPopTileIds: EMPTY_ID_SET,
      };
    case "comboDialogOpenSet":
      return { ...state, comboDialogOpen: action.open };
    case "comboDialogOpened":
      return {
        ...state,
        placementRewardBlocking: false,
        comboDialogOpen: true,
      };
    case "comboDialogDismissed":
      return { ...state, comboDialogOpen: false, comboDialogTile: null };
    case "rewardBlockingSet":
      return { ...state, placementRewardBlocking: action.blocking };
    case "barScoreAnimationSet":
      return { ...state, barScoreAnimationOverride: action.value };
    case "gainLabelSet":
      return { ...state, barScoreGainLabel: action.label };
    case "toastSet":
      return { ...state, secondaryRewardToast: action.toast };
    case "draggingTileSet":
      return { ...state, draggingTileId: action.tileId };
  }
}
