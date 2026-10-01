import type { LevelPlayPhase } from "@/routes/level/navigation/levelPlayPhase";
import {
  LEVEL_PLAY_PHASE,
  levelPlayPhaseToSegment,
} from "@/routes/level/navigation/levelPlayPhase";

export const ROUTES = {
  slideshow: "/slideshow",
  /** 1-basierte Slide (`/slideshow/1`). */
  slideshowSlide: (oneBasedSlide: number) =>
    `/slideshow/${encodeURIComponent(String(oneBasedSlide))}`,
  map: "/karte",
  mapDistrictDetail: (id: string) => `/karte/${encodeURIComponent(id)}`,
  /** Level-Detail-Sheet (volle Höhe) — optional konkretes Level in der URL. */
  mapDistrictLevelDetail: (districtRouteId: string, levelKey?: string | null) => {
    const base = `/karte/${encodeURIComponent(districtRouteId)}/detail`;
    const key = levelKey?.trim();
    return key ? `${base}/${encodeURIComponent(key)}` : base;
  },
  projektpartner: "/projektpartner",
  /** CMS `rechtlich.slug` als Root-Pfad, z. B. `/impressum`. */
  rechtliches: (slug: string) => `/${encodeURIComponent(slug)}`,
  level: "/level",
  /** Platzierungsphase unter /level/:id. */
  levelPlay: (levelId: string) =>
    `/level/${encodeURIComponent(levelId)}`,
  levelIntro: (levelId: string) =>
    `/level/${encodeURIComponent(levelId)}/${LEVEL_PLAY_PHASE.intro}`,
  levelMission: (levelId: string) =>
    `/level/${encodeURIComponent(levelId)}/${LEVEL_PLAY_PHASE.mission}`,
  levelPhase: (levelId: string, phase: LevelPlayPhase) => {
    const segment = levelPlayPhaseToSegment(phase);
    const base = `/level/${encodeURIComponent(levelId)}`;
    return segment ? `${base}/${segment}` : base;
  },
  debugLichtenbergLayout: "/debug/lichtenberg-layout",
  /** Statistikauswertung mit Anmeldung, ohne öffentliche Navigation oder Suchmaschinenindexierung. */
  analytics: "/analytics",
  gallerie: "/gallerie",
  gallerieLevel: (levelKey: string) =>
    `/gallerie/${encodeURIComponent(levelKey)}`,
} as const;

/** `/gallerie` und `/gallerie/:levelKey`. */
export function isGalleriePathname(pathname: string): boolean {
  return (
    pathname === ROUTES.gallerie ||
    pathname.startsWith(`${ROUTES.gallerie}/`)
  );
}

/** Router-Pattern für die Rechtliches-Seite (CMS-Slug). */
export const RECHTLICHES_ROUTE_PATTERN = "/:legalSlug";

export const RECHTLICHES_ROUTE_HANDLE = { isRechtliches: true } as const;

const RESERVED_RECHTLICHES_SLUGS = new Set([
  ROUTES.slideshow.slice(1).split("/")[0],
  ROUTES.map.slice(1),
  ROUTES.gallerie.slice(1),
  ROUTES.projektpartner.slice(1),
  ROUTES.level.slice(1),
  ROUTES.analytics.slice(1),
]);

/** `null` wenn Slug fehlt oder mit fester App-Route kollidiert. */
export function rechtlichesPath(
  slug: string | null | undefined,
): string | null {
  const value = typeof slug === "string" ? slug.trim() : "";
  if (!value || RESERVED_RECHTLICHES_SLUGS.has(value)) {
    return null;
  }
  return ROUTES.rechtliches(value);
}

export function routeHandleIsRechtliches(handle: unknown): boolean {
  return (
    typeof handle === "object" &&
    handle != null &&
    "isRechtliches" in handle &&
    (handle as { isRechtliches?: boolean }).isRechtliches === true
  );
}
