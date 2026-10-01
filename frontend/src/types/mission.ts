import type { LevelBonusCategoryId } from "@/domain/levelBonusCategories";

/** Strapi `api::mission.mission` – Anzeige für Bonus-Zeilen nach `type`. */
export type MissionBonusByType = {
  type: LevelBonusCategoryId;
  title: string;
  imageUrl: string | null;
  imageAlt: string;
};

export type MissionBonusCatalog = ReadonlyMap<
  LevelBonusCategoryId,
  MissionBonusByType
>;
