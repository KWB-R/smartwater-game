import { StrapiFetchError, strapiFetch } from "@/api/client";
import { toAppError } from "@/api/errors";
import { dedupeInflight } from "@/api/requestDedup";
import { mapProjektpartnerResponse } from "@/api/mappers/projektpartnerMapper";
import { projektpartnerResponseSchema } from "@/api/schemas/projektpartnerSchema";
import { isStrapiConfigured } from "@/lib/env";
import type { ProjektpartnerContent } from "@/types/content";

const PROJEKTPARTNER_PATH =
  "/projektpartner?populate[collaborators][populate][image]=true&populate[fundedByMedia][populate][image]=true";

const EMPTY_PROJEKTPARTNER: ProjektpartnerContent = {
  collaborateContent: null,
  collaborators: [],
  fundedByTitle: null,
  fundedByMedia: [],
  fundedByContent: null,
};

export const fetchProjektpartner = dedupeInflight(
  async function loadProjektpartner(): Promise<ProjektpartnerContent> {
    if (!isStrapiConfigured()) {
      return EMPTY_PROJEKTPARTNER;
    }

    try {
      const raw = await strapiFetch<unknown>(PROJEKTPARTNER_PATH);
      const parsed = projektpartnerResponseSchema.parse(raw);
      return mapProjektpartnerResponse(
        (parsed.data as Record<string, unknown> | null) ?? null,
      );
    } catch (error) {
      // Fehlende Inhalte oder Zugriffsrechte führen zur vorgesehenen Ersatzansicht.
      if (
        error instanceof StrapiFetchError &&
        (error.status === 404 || error.status === 403)
      ) {
        return EMPTY_PROJEKTPARTNER;
      }
      throw toAppError(error);
    }
  },
  () => "projektpartner",
);
