import { cn } from "@/lib/cn";
import type { Level, Tile } from "@/features/level/types";
import {
  getLevelBonusCategoryMeta,
  readCategoryIsBonus,
  TILE_DETAIL_CATEGORY_ORDER,
  type LevelBonusCategoryId,
  type LevelPunkteRecord,
} from "@/domain/levelBonusCategories";
import { MissionCategoryBadge } from "@/components/features/level/CategoryBadge";
import {
  activeMissionCategoryIds,
  tileCategoryFilledDots,
  tileCategoryFilledDotsFromPunkte,
} from "@/features/level/logic/tileCategoryPoints";
import { useMissionBonusCatalog } from "@/features/level/hooks/useMissionBonusCatalog";
import { TileDetailMissionProgressBar } from "@/components/features/level/library/TileDetailMissionProgressBar";

type TileDetailMissionListProps = {
  tile: Tile;
  level: Level;
  tilePunkte: LevelPunkteRecord | null;
  levelPuzzleItems: ReadonlyArray<{ punkte: LevelPunkteRecord }>;
  reducedMotion?: boolean;
};

export function TileDetailMissionList({
  tile,
  level,
  tilePunkte,
  levelPuzzleItems,
  reducedMotion = false,
}: TileDetailMissionListProps) {
  const missionIds = activeMissionCategoryIds(levelPuzzleItems, level);
  const showMissionBadge = (id: LevelBonusCategoryId) => missionIds.has(id);

  const { catalog: missionCatalog } = useMissionBonusCatalog();

  const categoryItems = TILE_DETAIL_CATEGORY_ORDER.map((categoryId) => {
    const { label } = getLevelBonusCategoryMeta(categoryId);
    const missionImageUrl = missionCatalog.get(categoryId)?.imageUrl ?? null;
    const filled = tilePunkte
      ? tileCategoryFilledDotsFromPunkte(categoryId, tilePunkte, level)
      : tileCategoryFilledDots(categoryId, tile.pointMatrix, level);
    const showBonus =
      tilePunkte != null && readCategoryIsBonus(tilePunkte, categoryId);
    const showMission = showMissionBadge(categoryId);

    return {
      categoryId,
      label,
      missionImageUrl,
      filled,
      showBonus,
      showMission,
    } as const;
  });

  const missionItems = categoryItems.filter((item) => item.showMission);
  const otherItems = categoryItems.filter((item) => !item.showMission);
  const showMissionDivider = missionItems.length > 0 && otherItems.length > 0;

  const renderCategoryItem = ({
    categoryId,
    label,
    missionImageUrl,
    filled,
    showBonus,
    showMission,
  }: (typeof categoryItems)[number]) => (
    <li
      key={categoryId}
      className={cn(
        "relative flex items-center gap-3 rounded-[2rem] bg-white px-3 pr-5 py-2",
        showMission ? "border-2 border-swg-purple" : "border-1 border-white",
      )}
    >
      {showMission ? <MissionCategoryBadge /> : null}
      {missionImageUrl ? (
        <img
          src={missionImageUrl}
          alt=""
          className="size-10 scale-125 shrink-0 rounded-full object-cover"
          decoding="async"
        />
      ) : (
        <div
          className="size-10 shrink-0 rounded-full bg-[rgb(55_81_114/0.12)]"
          aria-hidden
        />
      )}
      <span className="min-w-0 flex-1 hyphens-auto font-text text-base text-swg-black">
        {label}
      </span>
      <TileDetailMissionProgressBar
        filled={filled}
        showBonus={showBonus}
        reducedMotion={reducedMotion}
      />
    </li>
  );

  return (
    <ul
      className="m-0 flex list-none flex-col gap-2 p-0"
      aria-label="Punkte nach Mission"
    >
      {categoryItems.length === 0 ? (
        <li className="rounded-[2rem] border border-swg-black/10 bg-white px-3 py-3 text-center shadow-[0_4px_14px_rgb(55_81_114/0.12)]">
          <p className="m-0 font-text text-base text-swg-black">
            Schöne Idee – aber für diese Puzzleteil gibt es keine
            schwammtastischen Punkte.
          </p>
        </li>
      ) : (
        <>
          {missionItems.map(renderCategoryItem)}
          {showMissionDivider ? (
            <li
              className="my-1 list-none border-0 border-t border-swg-black/15"
              aria-hidden
            />
          ) : null}
          {otherItems.map(renderCategoryItem)}
        </>
      )}
    </ul>
  );
}
