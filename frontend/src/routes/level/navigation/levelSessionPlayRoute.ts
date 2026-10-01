import { matchPath } from "react-router-dom";
import {
  LEVEL_PLAY_PHASE,
  parseLevelPlayPhaseParam,
} from "@/routes/level/navigation/levelPlayPhase";

/** true, wenn die aktive Unterroute die Platzierungsphase mit Puzzleteilbibliothek ist. */
export function isLevelPlayOutletPath(pathname: string): boolean {
  const match = matchPath("/level/:levelId/:phase?", pathname);
  if (!match) {
    return false;
  }
  return (
    parseLevelPlayPhaseParam(match.params.phase) === LEVEL_PLAY_PHASE.placing
  );
}
