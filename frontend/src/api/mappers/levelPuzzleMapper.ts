import {
  normalizeStrapiDocument,
  readStrapiComponentList,
  unwrapStrapiRelation,
} from "@/api/schemas/strapiCommon";
import type { LevelPunkteRecord } from "@/domain/levelBonusCategories";
import { mapBlocksField } from "@/api/mappers/blocksMapper";
import type { DistrictLevelPuzzleItem, LevelPlacementOrderEntry } from "@/types/content";
import { z } from "zod";

type PuzzleItemDto = {
  __component?: string;
  name?: string;
  content?: unknown;
  uniqueId?: string;
  unique_id?: string;
  kombiChild?: string;
  kombi_child?: string;
  id?: number | string;
  punkte?: unknown;
};

const punkteSchema = z.record(z.string(), z.unknown());

function coerceFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function coerceBoolean(value: unknown): boolean | undefined {
  if (value === true || value === false) return value;
  if (value === 1) return true;
  if (value === 0) return false;
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes") return true;
    if (s === "false" || s === "0" || s === "no") return false;
  }
  return undefined;
}

function normalizeLevelPunkteRecord(
  value: Record<string, unknown>,
): LevelPunkteRecord {
  const out: Record<string, unknown> = {};

  for (const [key, rawVal] of Object.entries(value)) {
    // Verschachtelte Kategorie mit bonus, isBonus und isMission.
    if (
      rawVal != null &&
      typeof rawVal === "object" &&
      !Array.isArray(rawVal)
    ) {
      const obj = rawVal as Record<string, unknown>;
      const bonus = coerceFiniteNumber(obj.bonus);
      const isBonus = coerceBoolean(obj.isBonus);
      const isMission = coerceBoolean(obj.isMission);

      // Nur erkennbare punkte-Einträge normalisieren; andere Objekte unverändert lassen.
      if (
        bonus !== undefined ||
        isBonus !== undefined ||
        isMission !== undefined ||
        "bonus" in obj ||
        "isBonus" in obj ||
        "isMission" in obj
      ) {
        out[key] = {
          ...obj,
          ...(bonus !== undefined ? { bonus } : {}),
          ...(isBonus !== undefined ? { isBonus } : {}),
          ...(isMission !== undefined ? { isMission } : {}),
        };
        continue;
      }
    }

    // Flache Felder älterer Datenstände, etwa bio_bonus und bio_isBonus.
    if (key.endsWith("_bonus")) {
      out[key] = coerceFiniteNumber(rawVal) ?? rawVal;
      continue;
    }
    if (key.endsWith("_isBonus") || key.endsWith("_isMission")) {
      out[key] = coerceBoolean(rawVal) ?? rawVal;
      continue;
    }

    out[key] = rawVal;
  }

  return out as LevelPunkteRecord;
}

function isEndAnimationComponent(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }
  const component = (value as PuzzleItemDto).__component;
  if (typeof component !== "string") {
    return false;
  }
  return (
    component === "object.end-animation" ||
    component.endsWith(".end-animation") ||
    component.includes("end-animation")
  );
}

function isPuzzleItemComponent(value: unknown): value is PuzzleItemDto {
  if (!value || typeof value !== "object") {
    return false;
  }
  if (isEndAnimationComponent(value)) {
    return false;
  }
  const component = (value as PuzzleItemDto).__component;
  if (typeof component !== "string") {
    return true;
  }
  return (
    component === "object.puzzle-item" ||
    component.endsWith(".puzzle-item") ||
    component.includes("puzzle-item")
  );
}

function mapPunkte(value: unknown): LevelPunkteRecord | null {
  const raw =
    normalizeStrapiDocument<Record<string, unknown>>(value) ??
    unwrapStrapiRelation<Record<string, unknown>>(value);
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const parsed = punkteSchema.safeParse(raw);
  return parsed.success ? normalizeLevelPunkteRecord(parsed.data) : null;
}

function puzzleItemUniqueId(entry: PuzzleItemDto): string {
  if (typeof entry.uniqueId === "string" && entry.uniqueId.trim().length > 0) {
    return entry.uniqueId.trim();
  }
  if (typeof entry.unique_id === "string" && entry.unique_id.trim().length > 0) {
    return entry.unique_id.trim();
  }
  if (entry.id != null && String(entry.id).trim().length > 0) {
    return String(entry.id).trim();
  }
  return "";
}

export function readLevelPuzzleItemsRaw(
  level: Record<string, unknown>,
): unknown {
  const puzzleItems = level.puzzleItems ?? level.puzzle_items;
  return puzzleItems ?? null;
}

export function mapLevelPuzzleItems(value: unknown): DistrictLevelPuzzleItem[] {
  const entries = readStrapiComponentList(value);
  const result: DistrictLevelPuzzleItem[] = [];
  for (const rawEntry of entries) {
    const entry = normalizeStrapiDocument<PuzzleItemDto>(rawEntry);
    if (!entry || !isPuzzleItemComponent(entry)) {
      continue;
    }
    const punkte = mapPunkte(entry.punkte);
    if (!punkte) {
      continue;
    }
    const uniqueId = puzzleItemUniqueId(entry);
    if (!uniqueId) {
      continue;
    }
    const name =
      typeof entry.name === "string" && entry.name.trim().length > 0
        ? entry.name.trim()
        : uniqueId;
    const kombiChildRaw =
      typeof entry.kombiChild === "string"
        ? entry.kombiChild
        : typeof entry.kombi_child === "string"
          ? entry.kombi_child
          : "";
    const kombiChild =
      kombiChildRaw.trim().length > 0 ? kombiChildRaw.trim() : null;
    result.push({
      uniqueId,
      name,
      kombiChild,
      content: mapBlocksField(entry.content),
      punkte,
    });
  }

  return result;
}

export function mapLevelPlacementOrder(value: unknown): LevelPlacementOrderEntry[] {
  const entries = readStrapiComponentList(value);
  const result: LevelPlacementOrderEntry[] = [];
  for (const rawEntry of entries) {
    const entry = normalizeStrapiDocument<PuzzleItemDto>(rawEntry);
    if (!entry) {
      continue;
    }
    if (isEndAnimationComponent(entry)) {
      const uniqueId = puzzleItemUniqueId(entry);
      if (uniqueId) {
        result.push({ kind: "endAnimation", uniqueId });
      }
      continue;
    }
    if (!isPuzzleItemComponent(entry)) {
      continue;
    }
    const punkte = mapPunkte(entry.punkte);
    if (!punkte) {
      continue;
    }
    const uniqueId = puzzleItemUniqueId(entry);
    if (!uniqueId) {
      continue;
    }
    result.push({ kind: "puzzle", uniqueId });
  }
  return result;
}

