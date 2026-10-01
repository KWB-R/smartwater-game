/**
 * Gemeinsames Medienmodell für Bilder, Videos und Spritesheets.
 * CMS-Uploads und lokale Leveldateien werden auf diese Struktur abgebildet.
 */
export type MediaAsset = {
  id: number;
  documentId?: string;
  url: string;
  name?: string;
  alternativeText?: string | null;
  caption?: string | null;
  width?: number | null;
  height?: number | null;
  formats?: Record<string, unknown> | null;
  [key: string]: unknown;
};
