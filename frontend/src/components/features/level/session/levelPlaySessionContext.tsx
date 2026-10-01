import {
  createContext,
  useContext,
  type Dispatch,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
} from "react";
import type { PlacedTile } from "@/features/level/logic/levelState";
import type { Tile } from "@/features/level/types";
import type { LevelPlayPhase } from "@/routes/level/navigation/levelPlayPhase";
import type { LevelUiPhase } from "@/features/level/play/levelPhaseSyncPlan";
import type {
  LevelPlayBoardDispatch,
  LevelPlayBoardState,
} from "@/features/level/play/levelPlayBoardState";
import type { LevelRouteModel } from "@/features/level/play/useLevelRouteModel";

/**
 * Getrennte Contexts für Konfiguration, Brett, Phase, Punkte und Aktionen.
 * Komponenten abonnieren nur die benötigten Werte; deren Aktualisierungshäufigkeit unterscheidet sich.
 */

/**
 * Selten wechselnde Levelkonfiguration aus useLevelRouteModel.
 * Enthält auch reducedMotion und boardSceneReady für die Darstellung der Spieloberfläche.
 */
export type LevelPlayConfigValue = Pick<
  LevelRouteModel,
  | "levelKey"
  | "cappedLevel"
  | "puzzleItems"
  | "placementOrder"
  | "missionGoalDimensions"
  | "districtName"
  | "missionLabel"
  | "level"
  | "endAnimation"
  | "endAnimations"
  | "introState"
  | "cmsLevel"
  | "cmsLevelStatus"
  | "missionLevelSummary"
  | "levelIdParam"
  | "levelPlayAssets"
> & {
  reducedMotion: boolean;
  boardSceneReady: boolean;
};

/** Brettzustand aus dem Reducer und Refs zur Synchronisierung mit der Szene. */
export type LevelPlayBoardValue = {
  boardState: LevelPlayBoardState;
  dispatchBoard: LevelPlayBoardDispatch;
  currentMaxTileCount: number;
  placedTilesForSceneRef: MutableRefObject<PlacedTile[]>;
  availableTilesForSyncRef: MutableRefObject<Tile[]>;
};

/** Aus der URL abgeleitete Spielphase und Steuerung der Vergleichsansicht unter dem Quiz. */
export type LevelPlayPhaseValue = {
  levelUiPhase: LevelUiPhase;
  playPhase: LevelPlayPhase;
  setQuizUnderlayActive: Dispatch<SetStateAction<boolean>>;
};

/** Punkte und Sterne für Header und Levelabschluss. */
export type LevelPlayScoringValue = {
  placementScoreSum: number;
  barMaxScore: number;
  headerBarScore: number;
  barDisplayScore: number;
  winningTotalBarScore: number;
  winningCompletionStars: number;
  minimumScorePercentage: number | null;
  showWinningMaxCelebration: boolean;
};

/**
 * Aktionen der Spielsitzung für Header, Ablage und Overlays.
 */
export type LevelPlayCommands = {
  onShareContinue: () => void;
  onComboDialogOpenChange: (open: boolean) => void;
  onComboDialogClosed: () => void;
  onThumbPointerDown: (tile: Tile, ev: ReactPointerEvent) => void;
  onOpenTileCardsMenu: () => void;
  onDetailClose: () => void;
  onDetailSelectTile: (tile: Tile) => void;
  onParticleBurstComplete: (key: number) => void;
  onRestartLevel: () => void;
  onExitPuzzleFailedToMap: () => void;
  onGoToQuiz: () => void;
};

const LevelPlayConfigContext = createContext<LevelPlayConfigValue | null>(null);
const LevelPlayBoardContext = createContext<LevelPlayBoardValue | null>(null);
const LevelPlayPhaseContext = createContext<LevelPlayPhaseValue | null>(null);
const LevelPlayScoringContext = createContext<LevelPlayScoringValue | null>(
  null,
);
const LevelPlayCommandsContext = createContext<LevelPlayCommands | null>(null);

export const LevelPlayConfigProvider = LevelPlayConfigContext.Provider;
export const LevelPlayBoardProvider = LevelPlayBoardContext.Provider;
export const LevelPlayPhaseProvider = LevelPlayPhaseContext.Provider;
export const LevelPlayScoringProvider = LevelPlayScoringContext.Provider;
export const LevelPlayCommandsProvider = LevelPlayCommandsContext.Provider;

export function useLevelPlayConfig(): LevelPlayConfigValue {
  const ctx = useContext(LevelPlayConfigContext);
  if (!ctx) {
    throw new Error(
      "useLevelPlayConfig must be used within LevelPlaySessionProvider",
    );
  }
  return ctx;
}

export function useLevelPlayBoard(): LevelPlayBoardValue {
  const ctx = useContext(LevelPlayBoardContext);
  if (!ctx) {
    throw new Error(
      "useLevelPlayBoard must be used within LevelPlaySessionProvider",
    );
  }
  return ctx;
}

export function useLevelPlayPhase(): LevelPlayPhaseValue {
  const ctx = useContext(LevelPlayPhaseContext);
  if (!ctx) {
    throw new Error(
      "useLevelPlayPhase must be used within LevelPlaySessionProvider",
    );
  }
  return ctx;
}

export function useLevelPlayScoring(): LevelPlayScoringValue {
  const ctx = useContext(LevelPlayScoringContext);
  if (!ctx) {
    throw new Error(
      "useLevelPlayScoring must be used within LevelPlaySessionProvider",
    );
  }
  return ctx;
}

export function useLevelPlayCommands(): LevelPlayCommands {
  const ctx = useContext(LevelPlayCommandsContext);
  if (!ctx) {
    throw new Error(
      "useLevelPlayCommands must be used within LevelPlaySessionProvider",
    );
  }
  return ctx;
}
