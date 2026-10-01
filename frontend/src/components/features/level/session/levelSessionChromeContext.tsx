import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { useLatestRef } from "@/hooks/useLatestRef";
import type { BoardScene } from "@/components/features/level/scene/pixi/BoardScene";
import type { Level } from "@/features/level/types";
import type { LevelGameShellVariant } from "@/components/features/level/session/levelGameShellClassName";

export type LevelSessionChromeState = {
  header: ReactNode;
  footer: ReactNode;
  dock: ReactNode;
  boardOverlay: ReactNode;
  /** Effekte hinter Brett-Overlay und Ablage. */
  boardCelebrationBackdrop: ReactNode;
  sceneClassName: string;
  boardChrome: ReactNode;
  topBar: ReactNode;
  boardSceneStack: ReactNode;
  shellVariant: LevelGameShellVariant;
  boardPointerEnabled: boolean;
  boardAriaLabel: string;
  boardRole: string;
};

function chromeStateEqual(
  a: LevelSessionChromeState,
  b: LevelSessionChromeState,
): boolean {
  return (
    a.header === b.header &&
    a.footer === b.footer &&
    a.dock === b.dock &&
    a.boardOverlay === b.boardOverlay &&
    a.boardCelebrationBackdrop === b.boardCelebrationBackdrop &&
    a.sceneClassName === b.sceneClassName &&
    a.boardChrome === b.boardChrome &&
    a.topBar === b.topBar &&
    a.boardSceneStack === b.boardSceneStack &&
    a.shellVariant === b.shellVariant &&
    a.boardPointerEnabled === b.boardPointerEnabled &&
    a.boardAriaLabel === b.boardAriaLabel &&
    a.boardRole === b.boardRole
  );
}

const EMPTY_CHROME: LevelSessionChromeState = {
  header: null,
  footer: null,
  dock: null,
  boardOverlay: null,
  boardCelebrationBackdrop: null,
  sceneClassName: "",
  boardChrome: null,
  topBar: null,
  boardSceneStack: null,
  shellVariant: "play",
  boardPointerEnabled: true,
  boardAriaLabel: "Level-Hintergrund",
  boardRole: "img",
};

export type LevelSessionChromePatch = Partial<LevelSessionChromeState>;

/** Brett-Overlays der Spielphase; beim Einstieg und Missionshinweis zurücksetzen. */
export const LEVEL_SESSION_CLEAR_PLAY_BOARD_OVERLAYS: LevelSessionChromePatch = {
  boardChrome: null,
  topBar: null,
};

type LevelSessionBoardContextValue = {
  levelKey: string;
  playLevel: Level;
  canvasHostRef: RefObject<HTMLDivElement | null>;
  designFrameRef: RefObject<HTMLDivElement | null>;
  boardSceneRef: RefObject<BoardScene | null>;
  setBoardScene: (scene: BoardScene | null) => void;
  boardSceneReady: boolean;
  chrome: LevelSessionChromeState;
  setChrome: (patch: LevelSessionChromePatch) => void;
  resetChrome: () => void;
};

const LevelSessionBoardContext =
  createContext<LevelSessionBoardContextValue | null>(null);

export function LevelSessionBoardProvider({
  levelKey,
  playLevel,
  children,
}: {
  levelKey: string;
  playLevel: Level;
  children: ReactNode;
}) {
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const designFrameRef = useRef<HTMLDivElement | null>(null);
  const boardSceneRef = useRef<BoardScene | null>(null);
  const [boardSceneReady, setBoardSceneReady] = useState(false);
  const [chrome, setChromeState] =
    useState<LevelSessionChromeState>(EMPTY_CHROME);

  const setBoardScene = useCallback((scene: BoardScene | null) => {
    boardSceneRef.current = scene;
    setBoardSceneReady(scene != null);
  }, [boardSceneRef]);

  const setChrome = useCallback((patch: LevelSessionChromePatch) => {
    setChromeState((prev) => {
      const next: LevelSessionChromeState = { ...prev, ...patch };
      if (!("boardSceneStack" in patch)) {
        next.boardSceneStack = null;
      }
      if (chromeStateEqual(prev, next)) {
        return prev;
      }
      return next;
    });
  }, []);

  const resetChrome = useCallback(() => {
    setChromeState((prev) =>
      chromeStateEqual(prev, EMPTY_CHROME) ? prev : EMPTY_CHROME,
    );
  }, []);

  useLayoutEffect(() => {
    resetChrome();
  }, [levelKey, resetChrome]);

  const value = useMemo(
    (): LevelSessionBoardContextValue => ({
      levelKey,
      playLevel,
      canvasHostRef,
      designFrameRef,
      boardSceneRef,
      setBoardScene,
      boardSceneReady,
      chrome,
      setChrome,
      resetChrome,
    }),
    [
      levelKey,
      playLevel,
      canvasHostRef,
      designFrameRef,
      boardSceneRef,
      setBoardScene,
      boardSceneReady,
      chrome,
      setChrome,
      resetChrome,
    ],
  );

  return (
    <LevelSessionBoardContext.Provider value={value}>
      {children}
    </LevelSessionBoardContext.Provider>
  );
}

export function useLevelSessionBoard(): LevelSessionBoardContextValue {
  const ctx = useContext(LevelSessionBoardContext);
  if (!ctx) {
    throw new Error("useLevelSessionBoard outside LevelSessionBoardProvider");
  }
  return ctx;
}

/**
 * Aktualisiert die Spieloberfläche, wenn sich syncKey ändert.
 * Der Schlüssel muss alle relevanten Punktewerte, Zustände und IDs enthalten.
 * Die React-Elemente im Patch entstehen bei jedem Render neu; ihre Objektidentität
 * würde eine fortlaufende Aktualisierung auslösen.
 */
export function useLevelSessionChrome(
  patch: LevelSessionChromePatch,
  syncKey: string,
): void {
  const { setChrome } = useLevelSessionBoard();
  const patchRef = useLatestRef(patch);

  useLayoutEffect(() => {
    setChrome(patchRef.current);
  }, [setChrome, syncKey, patchRef]);
}
