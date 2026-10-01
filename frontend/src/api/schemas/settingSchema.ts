import { z } from "zod";

export const settingResponseSchema = z.object({
  data: z
    .object({
      id: z.number().optional(),
      documentId: z.string().optional(),
      title: z.string().nullable().optional(),
      /** Beschreibung für Suchmaschinen und Linkvorschauen. */
      meta_description: z.string().nullable().optional(),
      logo: z.unknown().optional(),
      /** Helles Logo (dunkler Hintergrund). */
      logo_inverted: z.unknown().optional(),
      /** Wiederholbare LinkComponent mit title und link. */
      externallinks: z.unknown().optional(),
      /** Wiederholbare LinkComponent für Impressum, Datenschutz und weitere rechtliche Seiten. */
      legalLinks: z.unknown().optional(),
      /** Texte und Ersatzbild zum Teilen aus shareComponent. */
      shareComponent: z.unknown().optional(),
      /** Inhalt und Bild für den Querformathinweis. */
      landscapeScreenComponent: z.unknown().optional(),
      /** Einwilligungstext und Schaltflächen für Zustimmung und Ablehnung. */
      consent: z.unknown().optional(),
      /** false deaktiviert die App und zeigt die Platzhalterseite. */
      enabled: z.boolean().nullable().optional(),
    })
    .passthrough()
    .nullable(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type SettingResponseDto = z.infer<typeof settingResponseSchema>;
