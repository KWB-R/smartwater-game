import { strapiFetch } from "@/api/client";
import { toAppError } from "@/api/errors";
import { dedupeInflight } from "@/api/requestDedup";
import { mapHomepageResponse } from "@/api/mappers/homepageMapper";
import { homepageResponseSchema } from "@/api/schemas/homepageSchema";
import { isStrapiConfigured } from "@/lib/env";
import type { HomepageContent } from "@/types/content";

const EMPTY_HOMEPAGE: HomepageContent = {
  content: null,
  slides: [],
};

/** content enthält Blocks samt Medien; ein zusätzliches populate würde HTTP 400 auslösen. */
const HOMEPAGE_PATH =
  "/homepage?populate[slideshow][populate][image]=true";

export const fetchHomepage = dedupeInflight(
  async function loadHomepage(): Promise<HomepageContent> {
    if (!isStrapiConfigured()) {
      return EMPTY_HOMEPAGE;
    }

    try {
      const raw = await strapiFetch<unknown>(HOMEPAGE_PATH);
      const parsed = homepageResponseSchema.parse(raw);
      return mapHomepageResponse(parsed.data);
    } catch (error) {
      throw toAppError(error);
    }
  },
  () => "homepage",
);
