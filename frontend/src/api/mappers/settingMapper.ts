import { mapStrapiMedia } from "@/api/mappers/mediaMapper";
import { resolveStrapiMediaUrl } from "@/api/media";
import { mapBlocksField } from "@/api/mappers/blocksMapper";
import {
  normalizeStrapiDocument,
  readStrapiComponentList,
  unwrapStrapiRelation,
} from "@/api/schemas/strapiCommon";
import type { SettingResponseDto } from "@/api/schemas/settingSchema";
import type {
  AppExternalLink,
  AppSettings,
  ConsentContent,
  LandscapeScreenContent,
} from "@/types/content";
import type { RichTextBlocks } from "@/domain/richText";
import type { StrapiMedia } from "@/types/strapi";

function logoAltText(media: StrapiMedia, siteTitle: string | null): string {
  const alt =
    typeof media.alternativeText === "string"
      ? media.alternativeText.trim()
      : "";
  if (alt) return alt;
  if (siteTitle) return siteTitle;
  return "";
}

/** Mappt Strapi-`LinkComponent` (`title` + `link`) auf App-Links. */
function mapExternalLinks(raw: unknown): AppExternalLink[] {
  const links: AppExternalLink[] = [];
  for (const entry of readStrapiComponentList(raw)) {
    const normalized =
      normalizeStrapiDocument<Record<string, unknown>>(entry) ?? null;
    if (!normalized) continue;
    const title =
      typeof normalized.title === "string" ? normalized.title.trim() : "";
    const href =
      typeof normalized.link === "string" ? normalized.link.trim() : "";
    if (!title || !href) continue;
    links.push({ label: title, href });
  }
  return links;
}

type MappedShareComponent = {
  shareCta: RichTextBlocks | null;
  shareContent: string | null;
  shareFallbackImageUrl: string | null;
};

/** Übernimmt Texte, Schaltflächen und das Ersatzbild zum Teilen aus shareComponent. */
function mapShareComponent(raw: unknown): MappedShareComponent {
  const unwrapped = unwrapStrapiRelation<unknown>(raw);
  const component =
    normalizeStrapiDocument<Record<string, unknown>>(unwrapped) ??
    (unwrapped && typeof unwrapped === "object"
      ? (unwrapped as Record<string, unknown>)
      : null);
  if (!component) {
    return {
      shareCta: null,
      shareContent: null,
      shareFallbackImageUrl: null,
    };
  }

  const contentRaw = component.shareContent;
  const shareContent =
    typeof contentRaw === "string" && contentRaw.trim() !== ""
      ? contentRaw.trim()
      : null;

  const fallbackMedia = mapStrapiMedia(component.shareFallbackImage);
  const fallbackUrl = fallbackMedia?.url
    ? resolveStrapiMediaUrl(fallbackMedia.url)
    : null;

  return {
    shareCta: mapBlocksField(component.shareCTA ?? null),
    shareContent,
    shareFallbackImageUrl:
      fallbackUrl && fallbackUrl !== "" ? fallbackUrl : null,
  };
}

/** Übernimmt Inhalt und Bild für den Querformathinweis aus landscapeScreenComponent. */
function mapLandscapeScreenComponent(raw: unknown): LandscapeScreenContent | null {
  const unwrapped = unwrapStrapiRelation<unknown>(raw);
  const component =
    normalizeStrapiDocument<Record<string, unknown>>(unwrapped) ??
    (unwrapped && typeof unwrapped === "object"
      ? (unwrapped as Record<string, unknown>)
      : null);
  if (!component) return null;

  const media = mapStrapiMedia(component.image);
  const imageUrl = media?.url ? resolveStrapiMediaUrl(media.url) : null;
  const content = mapBlocksField(component.content ?? null);
  const hasImage = imageUrl != null && imageUrl !== "";
  if (!content && !hasImage) return null;

  return {
    content,
    imageUrl: hasImage ? imageUrl : null,
    imageAlt: media ? logoAltText(media, null) : "",
  };
}

const DEFAULT_ACCEPT_BUTTON = "Statistik erlauben";
const DEFAULT_DENY_BUTTON = "Nein, danke";

/** Übernimmt Einwilligungstext und Beschriftungen aus consent oder consentComponent. */
function mapConsentComponent(raw: unknown): ConsentContent | null {
  const unwrapped = unwrapStrapiRelation<unknown>(raw);
  const component =
    normalizeStrapiDocument<Record<string, unknown>>(unwrapped) ??
    (unwrapped && typeof unwrapped === "object"
      ? (unwrapped as Record<string, unknown>)
      : null);
  if (!component) return null;

  const content = mapBlocksField(component.content ?? null);
  if (!content) return null;

  const acceptRaw = component.acceptButton;
  const denyRaw = component.denyButton;
  const acceptButton =
    typeof acceptRaw === "string" && acceptRaw.trim() !== ""
      ? acceptRaw.trim()
      : DEFAULT_ACCEPT_BUTTON;
  const denyButton =
    typeof denyRaw === "string" && denyRaw.trim() !== ""
      ? denyRaw.trim()
      : DEFAULT_DENY_BUTTON;

  return { content, acceptButton, denyButton };
}

export function mapSettingResponse(
  data: SettingResponseDto["data"],
): AppSettings {
  const normalized =
    normalizeStrapiDocument<Record<string, unknown>>(data) ?? null;
  const titleRaw = normalized?.title;
  const siteTitle =
    typeof titleRaw === "string" && titleRaw.trim() !== ""
      ? titleRaw.trim()
      : null;
  const metaDescriptionRaw = normalized?.meta_description;
  const metaDescription =
    typeof metaDescriptionRaw === "string" && metaDescriptionRaw.trim() !== ""
      ? metaDescriptionRaw.trim()
      : null;
  const logoMedia = mapStrapiMedia(normalized?.logo);
  const logoUrl = logoMedia?.url
    ? resolveStrapiMediaUrl(logoMedia.url)
    : null;
  const logoInvertedMedia = mapStrapiMedia(normalized?.logo_inverted);
  const logoInvertedUrl = logoInvertedMedia?.url
    ? resolveStrapiMediaUrl(logoInvertedMedia.url)
    : null;
  const share = mapShareComponent(normalized?.shareComponent);

  return {
    siteTitle,
    metaDescription,
    logoUrl: logoUrl && logoUrl !== "" ? logoUrl : null,
    logoAlt: logoMedia ? logoAltText(logoMedia, siteTitle) : "",
    logoInvertedUrl:
      logoInvertedUrl && logoInvertedUrl !== "" ? logoInvertedUrl : null,
    logoInvertedAlt: logoInvertedMedia
      ? logoAltText(logoInvertedMedia, siteTitle)
      : "",
    externalLinks: mapExternalLinks(normalized?.externallinks),
    legalLinks: mapExternalLinks(normalized?.legalLinks),
    shareCta: share.shareCta,
    shareContent: share.shareContent,
    shareFallbackImageUrl: share.shareFallbackImageUrl,
    landscapeScreen: mapLandscapeScreenComponent(
      normalized?.landscapeScreenComponent,
    ),
    consent: mapConsentComponent(normalized?.consent),
    // Nur ein ausdrücklich gesetztes false deaktiviert die App.
    enabled: normalized?.enabled !== false,
  };
}
