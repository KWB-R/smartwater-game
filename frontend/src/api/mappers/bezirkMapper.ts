import { resolveStrapiMediaUrl } from "@/api/media";
import type { BezirkDto } from "@/api/schemas/bezirkSchema";
import {
  normalizeStrapiDocument,
  unwrapStrapiRelation,
  unwrapStrapiRelationList,
  parseStrapiMedia,
} from "@/api/schemas/strapiCommon";
import {
  levelSummarySchema,
  type LevelSummaryDto,
} from "@/api/schemas/bezirkSchema";
import type {
  District,
  DistrictLevelMapMarkerPosition,
  DistrictLevelMissionSummary,
  DistrictLevelSummary,
} from "@/types/content";
import { mapBlocksField } from "@/api/mappers/blocksMapper";
import {
  mapLevelPuzzleItems,
  mapLevelPlacementOrder,
  readLevelPuzzleItemsRaw,
} from "@/api/mappers/levelPuzzleMapper";
import { mapLevelQuiz, readLevelQuizRaw } from "@/api/mappers/levelQuizMapper";
import { enrichDistrictLevelSummary } from "@/api/mappers/enrichDistrictLevel";
import { normalizeLevelAssetsFolderPath } from "@/domain/normalizeLevelAssetsFolderPath";

function mediaFromMaskottchenKey(
  dto: LevelSummaryDto,
  key: "happy" | "superhappy" | "unhappy",
): { url: string; alt: string } | null {
  const component = dto.maskottchen;
  if (!component || typeof component !== "object") {
    return null;
  }
  const raw = component[key];
  if (!raw) {
    return null;
  }
  const unwrapped = unwrapStrapiRelation<unknown>(raw);
  const normalized =
    normalizeStrapiDocument<Record<string, unknown>>(unwrapped);
  const candidate = normalized ?? unwrapped;
  if (!candidate || typeof candidate !== "object") {
    return null;
  }
  const strict = parseStrapiMedia(candidate);
  const record = candidate as Record<string, unknown>;
  const urlRaw =
    strict?.url ??
    (typeof record.url === "string" ? record.url : undefined);
  if (!urlRaw?.trim()) {
    return null;
  }
  const url = resolveStrapiMediaUrl(urlRaw);
  if (!url) {
    return null;
  }
  const altSource =
    strict?.alternativeText ??
    (typeof record.alternativeText === "string"
      ? record.alternativeText
      : null);
  return {
    url,
    alt: altSource?.trim() ?? "",
  };
}

function previewMediaFromMaskottchen(
  dto: LevelSummaryDto,
): { url: string; alt: string } | null {
  const keys = ["happy", "superhappy", "unhappy"] as const;
  for (const key of keys) {
    const media = mediaFromMaskottchenKey(dto, key);
    if (media) {
      return media;
    }
  }
  return null;
}

function mapMissionSummary(
  dto: LevelSummaryDto,
): DistrictLevelMissionSummary | null {
  const mission = unwrapStrapiRelation<{
    title?: string;
    content?: unknown;
    image?: unknown;
  }>(dto.mission);
  const title = mission?.title?.trim();
  if (!title) {
    return null;
  }
  const image = mission?.image ? parseStrapiMedia(mission.image) : null;
  return {
    title,
    content: mapBlocksField(mission?.content),
    imageUrl: image?.url ? resolveStrapiMediaUrl(image.url) : null,
    imageAlt: image?.alternativeText?.trim() ?? title,
  };
}

function parseLevelSummaryDto(dtoRaw: unknown): LevelSummaryDto {
  const normalized =
    normalizeStrapiDocument<LevelSummaryDto>(dtoRaw) ??
    (dtoRaw as LevelSummaryDto);
  const parsed = levelSummarySchema.safeParse(normalized);
  return parsed.success ? parsed.data : normalized;
}

function mapMapMarkerPosition(
  raw: LevelSummaryDto["mapMarkerPosition"],
): DistrictLevelMapMarkerPosition | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const x = Number(raw.x);
  const y = Number(raw.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }
  return { x, y };
}

function parsePrimaryLevel(value: unknown): boolean {
  return value === false ? false : true;
}

/** Ohne shareable oder bei null ist das Level standardmäßig teilbar. */
function parseShareable(value: unknown): boolean {
  return value === false ? false : true;
}

function readOptionalSlug(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function mapLevelSummary(dto: LevelSummaryDto): DistrictLevelSummary {
  const name = dto.name?.trim() ?? "Level";
  const puzzleItemsRaw = readLevelPuzzleItemsRaw(
    dto as Record<string, unknown>,
  );
  const puzzleItems = mapLevelPuzzleItems(puzzleItemsRaw);
  const placementOrder = mapLevelPlacementOrder(puzzleItemsRaw);

  const happyMascot = mediaFromMaskottchenKey(dto, "happy");
  const superhappyMascot = mediaFromMaskottchenKey(dto, "superhappy");
  const unhappyMascot = mediaFromMaskottchenKey(dto, "unhappy");
  const previewMascot = previewMediaFromMaskottchen(dto);

  return enrichDistrictLevelSummary({
    id: dto.id,
    documentId: dto.documentId ?? null,
    name,
    primaryLevel: parsePrimaryLevel(
      (dto as Record<string, unknown>).primaryLevel ?? dto.primaryLevel,
    ),
    shareable: parseShareable(
      (dto as Record<string, unknown>).shareable ?? dto.shareable,
    ),
    maxPuzzleItems:
      typeof dto.maxPuzzleItems === "number" ? dto.maxPuzzleItems : null,
    minimumScorePercentage:
      typeof dto.minimumScorePercentage === "number"
        ? dto.minimumScorePercentage
        : null,
    assetsFolder: normalizeLevelAssetsFolderPath(dto.assetsFolder),
    mapMarkerPosition: mapMapMarkerPosition(dto.mapMarkerPosition),
    mission: mapMissionSummary(dto),
    puzzleItems,
    placementOrder,
    achievableBonuses: [],
    slug: readOptionalSlug(dto.slug),
    previewImageUrl: previewMascot?.url ?? null,
    previewImageAlt: previewMascot?.alt ?? "",
    unhappyMascotUrl: unhappyMascot?.url ?? null,
    unhappyMascotAlt: unhappyMascot?.alt ?? "",
    happyMascotUrl: happyMascot?.url ?? null,
    happyMascotAlt: happyMascot?.alt ?? "",
    superhappyMascotUrl: superhappyMascot?.url ?? null,
    superhappyMascotAlt: superhappyMascot?.alt ?? "",
    problemContent: mapBlocksField(dto.problemContent),
    quiz: mapLevelQuiz(readLevelQuizRaw(dto as Record<string, unknown>)),
    winContent: mapBlocksField(dto.winContent),
    winningContent: mapBlocksField(dto.winningContent),
  });
}

export function mapLevelFromDto(dtoRaw: unknown): DistrictLevelSummary {
  return mapLevelSummary(parseLevelSummaryDto(dtoRaw));
}

function mapLevelsField(value: unknown): DistrictLevelSummary[] {
  const list = unwrapStrapiRelationList<unknown>(value);
  return list.map((entry) => mapLevelFromDto(entry));
}

export function mapBezirkDto(dto: BezirkDto): District {
  const image = dto.image ? parseStrapiMedia(dto.image) : null;
  const bezirkIdRaw = dto.bezirkId;
  const bezirkId =
    typeof bezirkIdRaw === "string" && bezirkIdRaw.trim().length > 0
      ? bezirkIdRaw.trim()
      : null;

  return {
    id: dto.id,
    documentId: dto.documentId ?? null,
    slug: readOptionalSlug(dto.slug),
    bezirkId,
    name: dto.name.trim(),
    description: mapBlocksField(dto.description),
    imageUrl: image?.url ? resolveStrapiMediaUrl(image.url) : null,
    imageAlt: image?.alternativeText?.trim() ?? dto.name,
    namensOffset: mapMapMarkerPosition(dto.namensOffset),
    levels: mapLevelsField(dto.levels),
  };
}

export function mapBezirksList(
  data: BezirkDto[] | null | undefined,
): District[] {
  return (data ?? []).map(mapBezirkDto);
}
