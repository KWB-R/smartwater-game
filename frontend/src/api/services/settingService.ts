import { strapiFetch } from "@/api/client";
import { mapSettingResponse } from "@/api/mappers/settingMapper";
import { settingResponseSchema } from "@/api/schemas/settingSchema";
import { isStrapiConfigured } from "@/lib/env";
import type { AppSettings } from "@/types/content";

const SETTING_PATH =
  "/setting?populate[logo]=true&populate[logo_inverted]=true&populate[externallinks]=true&populate[legalLinks]=true&populate[shareComponent][populate][shareFallbackImage]=true&populate[landscapeScreenComponent][populate][image]=true&populate[consent]=true";

export const EMPTY_APP_SETTINGS: AppSettings = {
  siteTitle: null,
  metaDescription: null,
  logoUrl: null,
  logoAlt: "",
  logoInvertedUrl: null,
  logoInvertedAlt: "",
  externalLinks: [],
  legalLinks: [],
  shareCta: null,
  shareContent: null,
  shareFallbackImageUrl: null,
  landscapeScreen: null,
  consent: null,
  enabled: true,
};

export async function fetchAppSettings(): Promise<AppSettings> {
  if (!isStrapiConfigured()) {
    return EMPTY_APP_SETTINGS;
  }

  try {
    const raw = await strapiFetch<unknown>(SETTING_PATH);
    const parsed = settingResponseSchema.parse(raw);
    return mapSettingResponse(parsed.data);
  } catch {
    return EMPTY_APP_SETTINGS;
  }
}
