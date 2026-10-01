import { mapStrapiMedia } from "@/api/mappers/mediaMapper";
import { resolveStrapiMediaUrl } from "@/api/media";
import { mapBlocksField } from "@/api/mappers/blocksMapper";
import {
  normalizeStrapiDocument,
  readStrapiComponentList,
} from "@/api/schemas/strapiCommon";
import type {
  ProjektpartnerContent,
  ProjektpartnerImageLink,
} from "@/types/content";
import type { StrapiMedia } from "@/types/strapi";

function imageAltText(media: StrapiMedia, title: string): string {
  const alt =
    typeof media.alternativeText === "string"
      ? media.alternativeText.trim()
      : "";
  if (alt) return alt;
  if (title) return title;
  return "";
}

/** Mappt Strapi-`imagelink` (`image` + `link` + `title`) auf App-Logos. */
function mapImageLinks(
  raw: unknown,
  idPrefix: string,
): ProjektpartnerImageLink[] {
  const links: ProjektpartnerImageLink[] = [];
  for (const [index, entry] of readStrapiComponentList(raw).entries()) {
    const normalized =
      normalizeStrapiDocument<Record<string, unknown>>(entry) ?? null;
    if (!normalized) continue;

    const title =
      typeof normalized.title === "string" ? normalized.title.trim() : "";
    const hrefRaw =
      typeof normalized.link === "string" ? normalized.link.trim() : "";
    const href = hrefRaw !== "" ? hrefRaw : null;
    const media = mapStrapiMedia(normalized.image);
    const imageUrl = media?.url ? resolveStrapiMediaUrl(media.url) : null;
    if (!imageUrl) continue;

    const idRaw = normalized.id;
    const id =
      typeof idRaw === "number" || typeof idRaw === "string"
        ? String(idRaw)
        : `${idPrefix}-${index}`;

    links.push({
      id,
      title,
      href,
      imageUrl,
      imageAlt: media ? imageAltText(media, title) : title,
    });
  }
  return links;
}

function mapFundedByTitle(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const title = raw.trim();
  return title !== "" ? title : null;
}

export function mapProjektpartnerResponse(
  data: Record<string, unknown> | null,
): ProjektpartnerContent {
  const normalized =
    normalizeStrapiDocument<Record<string, unknown>>(data) ?? null;

  return {
    collaborateContent: mapBlocksField(
      normalized?.collaborateContent ?? null,
    ),
    collaborators: mapImageLinks(normalized?.collaborators, "collaborator"),
    fundedByTitle: mapFundedByTitle(normalized?.fundeByTitle),
    fundedByMedia: mapImageLinks(normalized?.fundedByMedia, "funded-by"),
    fundedByContent: mapBlocksField(normalized?.fundedByContent ?? null),
  };
}
