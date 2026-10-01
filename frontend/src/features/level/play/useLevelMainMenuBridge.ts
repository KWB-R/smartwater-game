import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { useSyncRef } from "@/hooks/useLatestRef";
import type {
  LevelLeaveGuard,
  LevelLeavePromptOptions,
  MainMenuGameActions,
} from "@/components/layout/mainMenuContext";

type UseLevelMainMenuBridgeArgs = {
  setMissionDialogOpen: Dispatch<SetStateAction<boolean>>;
  /** Aktuelle Tutorialaktion mit stabiler Ref. */
  showTutorial: () => void;
  /** Aktuelle Neustartaktion mit stabiler Ref. */
  handleRestartLevel: () => void;
  /** Prüfung aus useLevelDiscardProgress vor dem Verlassen des Spiels. */
  promptLeave: (
    proceed: () => void,
    options?: LevelLeavePromptOptions,
  ) => void;
  setGameActions: (actions: MainMenuGameActions) => void;
  setLevelLeaveGuard: (guard: LevelLeaveGuard | null) => void;
};

/**
 * Registriert Mission, Tutorial, Neustart und Verlassen-Dialog im Hauptmenü.
 * Stabile Callbacks verwenden dabei die jeweils aktuellen Aktionen aus Refs.
 */
export function useLevelMainMenuBridge({
  setMissionDialogOpen,
  showTutorial,
  handleRestartLevel,
  promptLeave,
  setGameActions,
  setLevelLeaveGuard,
}: UseLevelMainMenuBridgeArgs): void {
  const promptLeaveRef = useRef<
    (action: () => void, options?: LevelLeavePromptOptions) => void
  >((action) => {
    action();
  });
  const showLevelTutorialRef = useRef<() => void>(() => {});
  const handleRestartLevelRef = useRef<() => void>(() => {});

  useSyncRef(promptLeaveRef, promptLeave);
  useSyncRef(showLevelTutorialRef, showTutorial);
  useSyncRef(handleRestartLevelRef, handleRestartLevel);

  const levelMainMenuActionsRef = useRef<MainMenuGameActions | null>(null);
  if (levelMainMenuActionsRef.current == null) {
    levelMainMenuActionsRef.current = {
      onShowMission: () => setMissionDialogOpen(true),
      onShowTutorial: () => showLevelTutorialRef.current(),
      onRestartLevel: () =>
        promptLeaveRef.current(() => handleRestartLevelRef.current()),
    };
  }

  useEffect(() => {
    setGameActions(levelMainMenuActionsRef.current!);
    return () => setGameActions({});
  }, [setGameActions]);

  useEffect(() => {
    setLevelLeaveGuard({
      promptLeave: (proceed, options) =>
        promptLeaveRef.current(proceed, options),
    });
    return () => setLevelLeaveGuard(null);
  }, [setLevelLeaveGuard]);
}
