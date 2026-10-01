import { mapBlocksField } from "@/api/mappers/blocksMapper";
import { normalizeStrapiDocument } from "@/api/schemas/strapiCommon";
import type { RechtlichesContent } from "@/types/content";

function mapTrimmed(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  return value !== "" ? value : null;
}

export function mapRechtlichesResponse(
  data: Record<string, unknown> | null,
): RechtlichesContent {
  const normalized =
    normalizeStrapiDocument<Record<string, unknown>>(data) ?? null;

  return {
    title: mapTrimmed(normalized?.title),
    slug: mapTrimmed(normalized?.slug),
    content: mapBlocksField(normalized?.content ?? null),
  };
}
