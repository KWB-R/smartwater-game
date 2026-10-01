import { ROUTES } from "@/routes/paths";

/**
 * Stabiler React-Schlüssel für den Routenbereich.
 * Wechsel untergeordneter Routen binden die Hauptseite dadurch nicht neu ein.
 */
export function outletTransitionKey(pathname: string): string {
  if (
    pathname === "/" ||
    pathname === ROUTES.slideshow ||
    pathname.startsWith(`${ROUTES.slideshow}/`)
  ) {
    return "home-intro";
  }

  if (pathname === ROUTES.map || pathname.startsWith(`${ROUTES.map}/`)) {
    return ROUTES.map;
  }

  if (
    pathname === ROUTES.gallerie ||
    pathname.startsWith(`${ROUTES.gallerie}/`)
  ) {
    return ROUTES.map;
  }

  const levelPrefix = `${ROUTES.level}/`;
  if (pathname.startsWith(levelPrefix)) {
    const rest = pathname.slice(levelPrefix.length);
    const levelId = rest.split("/")[0];
    if (levelId) {
      return `${ROUTES.level}/${levelId}`;
    }
  }

  return pathname;
}
