import { useCallback, useSyncExternalStore } from "react";
import {
  getLevelHeaderSnapshot,
  subscribeLevelHeaderSnapshot,
  type LevelHeaderSnapshot,
} from "@/features/level/levelHeaderSnapshot";

export function useLevelHeaderSnapshot(
  levelKey: string | null | undefined,
): LevelHeaderSnapshot | null {
  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      subscribeLevelHeaderSnapshot((snapshot) => {
        if (snapshot.levelKey === levelKey) {
          onStoreChange();
        }
      }),
    [levelKey],
  );

  return useSyncExternalStore(subscribe, () =>
    getLevelHeaderSnapshot(levelKey),
  );
}
