import { strapiFetch } from "@/api/client";
import { mapMapPageResponse } from "@/api/mappers/mapPageMapper";
import { mapPageResponseSchema } from "@/api/schemas/mapPageSchema";
import { toAppError } from "@/api/errors";
import { dedupeInflight } from "@/api/requestDedup";
import { isStrapiConfigured } from "@/lib/env";
import type { MapPageContent } from "@/types/content";

const MAP_PAGE_PATH = "/map-page";

const EMPTY_MAP_PAGE: MapPageContent = {
  content: null,
  usabilityContent: null,
  usabilityContentAfterWinning: null,
  winningContent: null,
};

export const fetchMapPage = dedupeInflight(
  async function loadMapPage(): Promise<MapPageContent> {
    if (!isStrapiConfigured()) {
      return EMPTY_MAP_PAGE;
    }
    try {
      const raw = await strapiFetch<unknown>(MAP_PAGE_PATH);
      const parsed = mapPageResponseSchema.parse(raw);
      return mapMapPageResponse(parsed.data);
    } catch (error) {
      throw toAppError(error);
    }
  },
  () => "map-page",
);
