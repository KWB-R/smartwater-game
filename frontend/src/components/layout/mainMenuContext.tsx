import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type MainMenuGameActions = {
  onShowMission?: () => void;
  onShowTutorial?: () => void;
  onRestartLevel?: () => void;
};

export type LevelLeavePromptOptions = {
  /** Dialog immer zeigen (z. B. explizites „Spiel beenden“), auch ohne Fortschritt. */
  force?: boolean;
};

export type LevelLeaveGuard = {
  promptLeave: (
    proceed: () => void,
    options?: LevelLeavePromptOptions,
  ) => void;
};

function gameActionsEqual(
  a: MainMenuGameActions,
  b: MainMenuGameActions,
): boolean {
  return (
    a.onShowMission === b.onShowMission &&
    a.onShowTutorial === b.onShowTutorial &&
    a.onRestartLevel === b.onRestartLevel
  );
}

type MainMenuContextValue = {
  isOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
  toggleMenu: () => void;
  gameActions: MainMenuGameActions;
  setGameActions: (actions: MainMenuGameActions) => void;
  levelLeaveGuard: LevelLeaveGuard | null;
  setLevelLeaveGuard: (guard: LevelLeaveGuard | null) => void;
};

const MainMenuContext = createContext<MainMenuContextValue | null>(null);

export function MainMenuProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [gameActions, setGameActionsState] = useState<MainMenuGameActions>({});
  const [levelLeaveGuard, setLevelLeaveGuardState] =
    useState<LevelLeaveGuard | null>(null);

  const openMenu = useCallback(() => setIsOpen(true), []);
  const closeMenu = useCallback(() => setIsOpen(false), []);
  const toggleMenu = useCallback(() => setIsOpen((open) => !open), []);

  const setGameActions = useCallback((actions: MainMenuGameActions) => {
    setGameActionsState((prev) =>
      gameActionsEqual(prev, actions) ? prev : actions,
    );
  }, []);

  const setLevelLeaveGuard = useCallback((guard: LevelLeaveGuard | null) => {
    setLevelLeaveGuardState(guard);
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      openMenu,
      closeMenu,
      toggleMenu,
      gameActions,
      setGameActions,
      levelLeaveGuard,
      setLevelLeaveGuard,
    }),
    [
      isOpen,
      openMenu,
      closeMenu,
      toggleMenu,
      gameActions,
      setGameActions,
      levelLeaveGuard,
      setLevelLeaveGuard,
    ],
  );

  return (
    <MainMenuContext.Provider value={value}>{children}</MainMenuContext.Provider>
  );
}

export function useMainMenu(): MainMenuContextValue {
  const ctx = useContext(MainMenuContext);
  if (!ctx) {
    throw new Error("useMainMenu must be used within MainMenuProvider");
  }
  return ctx;
}
