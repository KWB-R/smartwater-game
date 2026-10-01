import { matchPath } from "react-router-dom";

const LEVEL_ROUTE_PATTERN = "/level/:levelId/:phase?";

export function isLeavingLevelRoute(
  currentPathname: string,
  nextPathname: string,
): boolean {
  const current = matchPath(LEVEL_ROUTE_PATTERN, currentPathname);
  if (!current) {
    return false;
  }
  const next = matchPath(LEVEL_ROUTE_PATTERN, nextPathname);
  if (!next) {
    return true;
  }
  return current.params.levelId !== next.params.levelId;
}
