/**
 * Typen für Strapi-Blocks aus der Content-API.
 * Die Struktur entspricht dem Domänenmodell in @/domain/richText; toStrapiBlocks übernimmt das Mapping.
 */
import type { StrapiBlock } from "@/types/strapi";
import type { RichTextBlocks } from "@/domain/richText";

export type { StrapiBlock } from "@/types/strapi";

export type StrapiBlocks = RichTextBlocks;

export function toStrapiBlocks(
  blocks: StrapiBlock[] | null | undefined,
): StrapiBlocks | null {
  if (!blocks?.length) return null;
  return blocks as StrapiBlocks;
}
