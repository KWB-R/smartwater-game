import type { NavigateFunction } from "react-router-dom";
import { withViewTransition } from "@/lib/navigateWithViewTransition";
import { ROUTES } from "@/routes/paths";
import type { LevelPlayPhase } from "@/routes/level/navigation/levelPlayPhase";
export type GoToLevelPhaseOptions = {
  replace?: boolean;
  state?: unknown;
  /** z. B. `combo=baum+eisdiele` für Share-Reload */
  search?: string;
};

export function goToLevelPhase(
  navigate: NavigateFunction,
  levelId: string,
  phase: LevelPlayPhase,
  options?: GoToLevelPhaseOptions,
): void {
  navigate(
    {
      pathname: ROUTES.levelPhase(levelId, phase),
      search: options?.search ?? "",
    },
    withViewTransition({
      replace: options?.replace ?? false,
      state: options?.state ?? undefined,
    }),
  );
}
