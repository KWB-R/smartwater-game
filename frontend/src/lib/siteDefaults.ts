/** Ersatzwert bei fehlenden CMS-Einstellungen, passend zu index.html. */
export const DEFAULT_DOCUMENT_TITLE = "Schwammtastisches Spiel Berlin";

/** Wiederverwendbare Beschreibung für Suchmaschinen und Linkvorschauen. */
export const DEFAULT_DOCUMENT_DESCRIPTION =
  "Schwammtastisch: Verwandle Grau in Blau-Grün und entdecke spielerisch, wie das Schwammstadt-Prinzip Berlin kühler, grüner und lebenswerter macht.";

/** CMS-Platzhalter für den Link im Freigabetext. */
export const SHARE_CONTENT_LINK_PLACEHOLDER = "[[LINK]]";

/**
 * Für Seitenvorschauen meta_description aus dem CMS verwenden, sonst den Standardtext.
 * shareContent gehört zum Freigabetext des Puzzleergebnisses.
 */
export function resolveSeoDescription(
  metaDescription?: string | null,
): string {
  return metaDescription?.trim() || DEFAULT_DOCUMENT_DESCRIPTION;
}
