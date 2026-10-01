import { z } from "zod";

const vectorSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const sizeSchema = z.object({
  width: z.number(),
  height: z.number(),
});

const configMediaRefSchema = z.object({
  url: z.string(),
  position: vectorSchema.optional(),
  size: sizeSchema.optional(),
  /** HTMLMediaElement.playbackRate (z. B. 0.75, 1.25); optional. */
  playbackRate: z.number().positive().optional(),
});

function isConfigMediaRef(value: unknown): value is {
  url: string;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  playbackRate?: number;
} {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { url?: unknown }).url === "string"
  );
}

/**
 * Verwendet intro und loop als einheitliche Medienstruktur.
 * Ältere placedVideoWeb-/placedVideo-Felder werden als loop übernommen.
 * Unbekannte Formen verwerfen, damit Videodarstellung und Ebenenreihenfolge verlässlich bleiben.
 */
function normalizePlacementVideoInput(value: unknown): unknown {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  const raw = value as Record<string, unknown>;
  if ("intro" in raw || "loop" in raw) {
    return value;
  }
  const web = raw.placedVideoWeb;
  const mov = raw.placedVideo;
  const loopSource = isConfigMediaRef(web)
    ? web
    : isConfigMediaRef(mov)
      ? mov
      : null;
  if (!loopSource) {
    return undefined;
  }
  return { loop: loopSource };
}

/** Eine URL pro Phase; Endung (.webm / .mov) wird beim Laden abgeleitet. */
const placementVideoSchema = z.preprocess(
  normalizePlacementVideoInput,
  z
    .object({
      intro: configMediaRefSchema.optional(),
      loop: configMediaRefSchema,
    })
    .optional(),
);

const levelConfigObjectSchema = z.object({
  id: z.string(),
  image: configMediaRefSchema,
  placementVideo: placementVideoSchema.optional(),
  socket: configMediaRefSchema.optional(),
});

const levelConfigEndAnimationSchema = configMediaRefSchema.extend({
  id: z.string().optional(),
});

const levelConfigSchema = z.object({
  name: z.string(),
  /** Obergrenze für die Zahl platzierter Puzzleteile. */
  maxPuzzleItems: z.number().int().positive().optional(),
  background: z.object({ url: z.string() }),
  objects: z.array(levelConfigObjectSchema),
  endAnimation: z
    .union([levelConfigEndAnimationSchema, z.array(levelConfigEndAnimationSchema)])
    .optional()
    .transform((value) => {
      if (value == null) {
        return undefined;
      }
      return Array.isArray(value) ? value : [value];
    }),
});

export type LevelConfigJson = z.infer<typeof levelConfigSchema>;
export type LevelConfigObject = LevelConfigJson["objects"][number];

export function parseLevelConfigJson(raw: unknown): LevelConfigJson {
  return levelConfigSchema.parse(raw);
}
