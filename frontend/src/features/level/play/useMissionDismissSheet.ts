import { useCallback, useEffect, useState } from "react";
import type { NavigateFunction } from "react-router-dom";
import { withViewTransition } from "@/lib/navigateWithViewTransition";
import type { LevelIntroLocationState } from "@/routes/level/navigation/levelIntroTypes";

type UseMissionDismissSheetArgs = {
  introState: LevelIntroLocationState | null;
  pathname: string;
  search: string;
  navigate: NavigateFunction;
};

export function useMissionDismissSheet({
  introState,
  pathname,
  search,
  navigate,
}: UseMissionDismissSheetArgs): {
  missionDismissOverlayActive: boolean;
  missionDismissSheetOpen: boolean;
  handleMissionDismissSheetClosed: () => void;
} {
  const missionSheetClosingEntry = introState?.missionSheetClosing === true;
  const [missionDismissOverlayActive, setMissionDismissOverlayActive] =
    useState(missionSheetClosingEntry);
  const [missionDismissSheetOpen, setMissionDismissSheetOpen] = useState(
    missionSheetClosingEntry,
  );

  useEffect(() => {
    if (!missionSheetClosingEntry) {
      return;
    }
    setMissionDismissSheetOpen(false);
  }, [missionSheetClosingEntry]);

  const clearMissionSheetClosingState = useCallback(() => {
    if (!introState) {
      return;
    }
    const nextState: LevelIntroLocationState = {
      district: introState.district,
      level: introState.level,
    };
    navigate(
      { pathname, search },
      withViewTransition({ replace: true, state: nextState }),
    );
  }, [introState, navigate, pathname, search]);

  const handleMissionDismissSheetClosed = useCallback(() => {
    setMissionDismissOverlayActive(false);
    clearMissionSheetClosingState();
  }, [clearMissionSheetClosingState]);

  return {
    missionDismissOverlayActive,
    missionDismissSheetOpen,
    handleMissionDismissSheetClosed,
  };
}
