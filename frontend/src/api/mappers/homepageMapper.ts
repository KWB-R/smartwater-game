import { mapStrapiMedia } from "@/api/mappers/mediaMapper";
import { resolveStrapiMediaUrl } from "@/api/media";
import { pickUrlFromFormats } from "@/api/strapiBlockImage";
import { mapBlocksField } from "@/api/mappers/blocksMapper";
import {
  normalizeStrapiDocument,
  readStrapiComponentList,
} from "@/api/schemas/strapiCommon";
import { homepageSlideSchema } from "@/api/schemas/homepageSchema";
import type {
  HomepageContent,
  HomepageSlide,
  HomepageSlideMediaKind,
} from "@/types/content";
import type { StrapiMedia } from "@/types/strapi";

const VIDEO_FILE_EXTENSIONS = /\.(mp4|webm|mov|m4v|ogv|ogg)(?:[?#].*)?$/i;

function mediaMime(media: StrapiMedia): string | null {
  return typeof media.mime === "string" ? media.mime : null;
}

function mediaAlternativeText(media: StrapiMedia): string {
  return typeof media.alternativeText === "string"
    ? media.alternativeText.trim()
    : "";
}

function detectMediaKind(media: StrapiMedia): HomepageSlideMediaKind {
  if (mediaMime(media)?.toLowerCase().startsWith("video/")) {
    return "video";
  }
  return VIDEO_FILE_EXTENSIONS.test(media.url) ? "video" : "image";
}

function resolveVideoPosterUrl(media: StrapiMedia): string | null {
  const record = media as Record<string, unknown>;
  const raw =
    pickUrlFromFormats(media.formats) ??
    (typeof record.previewUrl === "string" ? record.previewUrl.trim() : "");
  if (!raw) {
    return null;
  }
  return resolveStrapiMediaUrl(raw);
}

function slideId(slide: { id?: number; documentId?: string }, index: number): string {
  return (
    slide.documentId ?? (slide.id != null ? String(slide.id) : `slide-${index}`)
  );
}

function mapHomepageSlide(raw: unknown, index: number): HomepageSlide | null {
  const normalized =
    normalizeStrapiDocument<Record<string, unknown>>(raw) ??
    (raw as Record<string, unknown>);
  const parsed = homepageSlideSchema.safeParse(normalized);
  if (!parsed.success) {
    return null;
  }

  const media = mapStrapiMedia(parsed.data.image);
  if (!media?.url) {
    return null;
  }

  const mediaUrl = resolveStrapiMediaUrl(media.url);
  if (!mediaUrl) {
    return null;
  }

  const mediaKind = detectMediaKind(media);

  return {
    id: slideId(parsed.data, index),
    mediaUrl,
    mediaKind,
    mediaMime: mediaMime(media),
    posterUrl: mediaKind === "video" ? resolveVideoPosterUrl(media) : null,
    alt: mediaAlternativeText(media),
    content: mapBlocksField(parsed.data.content),
  };
}

export function mapHomepageResponse(
  data: { content?: unknown; slideshow?: unknown } | null,
): HomepageContent {
  const slides = readStrapiComponentList(data?.slideshow)
    .map((slide, index) => mapHomepageSlide(slide, index))
    .filter((slide): slide is HomepageSlide => slide != null);

  return {
    content: mapBlocksField(data?.content),
    slides,
  };
}
