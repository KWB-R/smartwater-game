import { resolveStrapiMediaUrl } from "@/api/media";
import {
  normalizeStrapiDocument,
  parseStrapiMedia,
  unwrapStrapiRelation,
} from "@/api/schemas/strapiCommon";

export type StrapiBlockImage = {
  src: string;
  alt: string;
};

/** Medien aus dem Blocks-Editor können ohne numerische id vorliegen; auch diese Form akzeptieren. */
export function resolveStrapiBlockImage(
  imageValue: unknown,
): StrapiBlockImage | null {
  const unwrapped = unwrapStrapiRelation<unknown>(imageValue);
  const normalized = normalizeStrapiDocument<Record<string, unknown>>(unwrapped);
  const candidate = normalized ?? unwrapped;
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const strict = parseStrapiMedia(candidate);
  const record = candidate as Record<string, unknown>;
  const urlRaw =
    strict?.url ??
    (typeof record.url === "string" ? record.url : undefined) ??
    pickUrlFromFormats(record.formats);

  if (!urlRaw?.trim()) {
    return null;
  }

  const src = resolveStrapiMediaUrl(urlRaw);
  if (!src) {
    return null;
  }

  const altSource =
    strict?.alternativeText ??
    (typeof record.alternativeText === "string"
      ? record.alternativeText
      : null);

  return {
    src,
    alt: altSource?.trim() ?? "",
  };
}

export function pickUrlFromFormats(formats: unknown): string | undefined {
  if (!formats || typeof formats !== "object") {
    return undefined;
  }
  for (const value of Object.values(formats as Record<string, unknown>)) {
    if (
      value &&
      typeof value === "object" &&
      typeof (value as { url?: unknown }).url === "string"
    ) {
      return (value as { url: string }).url;
    }
  }
  return undefined;
}

export function blockImagePayload(block: Record<string, unknown>): unknown {
  const nested = block.image ?? block.file ?? block.media;
  if (nested != null) {
    return nested;
  }
  if (typeof block.url === "string" && block.url.trim() !== "") {
    return block;
  }
  return null;
}

export function isStrapiImageBlock(block: Record<string, unknown>): boolean {
  if (block.type === "image") {
    return true;
  }
  return blockImagePayload(block) != null;
}
