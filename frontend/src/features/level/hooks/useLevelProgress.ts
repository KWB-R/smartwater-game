import { useCallback, useSyncExternalStore } from "react";
import {
  getLevelProgressSnapshot,
  subscribeLevelProgress,
  type LevelProgress,
} from "@/features/level/levelProgress";

export function useLevelProgress(
  levelKey: string | null | undefined,
): LevelProgress | null {
  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      subscribeLevelProgress((changedKey) => {
        if (changedKey === levelKey) {
          onStoreChange();
        }
      }),
    [levelKey],
  );

  return useSyncExternalStore(subscribe, () =>
    getLevelProgressSnapshot(levelKey),
  );
}
