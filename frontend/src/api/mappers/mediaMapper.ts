import type { StrapiMedia } from "@/types/strapi";
import {
  normalizeStrapiDocument,
  parseStrapiMedia,
  unwrapStrapiRelation,
} from "@/api/schemas/strapiCommon";

/** Akzeptiert Medien sowohl direkt als auch in Strapis data-/attributes-Hülle. */
export function mapStrapiMedia(raw: unknown): StrapiMedia | null {
  const unwrapped = unwrapStrapiRelation<unknown>(raw);
  const normalized = normalizeStrapiDocument<Record<string, unknown>>(unwrapped);
  return parseStrapiMedia(normalized ?? unwrapped);
}
