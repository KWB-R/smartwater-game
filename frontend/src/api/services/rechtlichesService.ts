import { StrapiFetchError, strapiFetch } from "@/api/client";
import { toAppError } from "@/api/errors";
import { dedupeInflight } from "@/api/requestDedup";
import { mapRechtlichesResponse } from "@/api/mappers/rechtlichesMapper";
import { rechtlichesResponseSchema } from "@/api/schemas/rechtlichesSchema";
import { isStrapiConfigured } from "@/lib/env";
import type { RechtlichesContent } from "@/types/content";

/** Der Single Type rechtlich liefert Blocks direkt in der Antwort. */
const RECHTLICHES_PATH = "/rechtlich";

const EMPTY_RECHTLICHES: RechtlichesContent = {
  title: null,
  slug: null,
  content: null,
};

export const fetchRechtliches = dedupeInflight(
  async function loadRechtliches(): Promise<RechtlichesContent> {
    if (!isStrapiConfigured()) {
      return EMPTY_RECHTLICHES;
    }

    try {
      const raw = await strapiFetch<unknown>(RECHTLICHES_PATH);
      const parsed = rechtlichesResponseSchema.parse(raw);
      return mapRechtlichesResponse(
        (parsed.data as Record<string, unknown> | null) ?? null,
      );
    } catch (error) {
      // Fehlende Inhalte oder Zugriffsrechte führen zur vorgesehenen Ersatzansicht.
      if (
        error instanceof StrapiFetchError &&
        (error.status === 404 || error.status === 403)
      ) {
        return EMPTY_RECHTLICHES;
      }
      throw toAppError(error);
    }
  },
  () => "rechtlich",
);
