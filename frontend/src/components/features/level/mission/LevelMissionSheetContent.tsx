import { MissionBonus } from "@/components/features/level/MissionBonus";
import { StrapiBlocksView } from "@/components/features/strapi/StrapiBlocksView";
import {
  getLevelBonusCategoryMeta,
  type LevelBonusRow,
} from "@/domain/levelBonusCategories";
import type { DistrictLevelSummary } from "@/types/content";
import type { MissionBonusCatalog } from "@/types/mission";

type LevelMissionSheetContentProps = {
  missionTitle: string;
  mission: DistrictLevelSummary["mission"];
  bonusRows: LevelBonusRow[];
  missionBonusCatalog: MissionBonusCatalog;
};

export function LevelMissionSheetContent({
  missionTitle,
  mission,
  bonusRows,
  missionBonusCatalog,
}: LevelMissionSheetContentProps) {
  return (
    <>
      <section className="mb-4 text-center">
        <h2
          id="mission-sheet-title"
          className="m-0 mb-3 font-text text-2xl font-bold text-swg-black"
        >
          {missionTitle}
        </h2>
        <div className="font-text text-base font-light leading-snug text-swg-black">
          <StrapiBlocksView
            blocks={mission?.content ?? null}
            emptyLabel="Kein Missionsinhalt für dieses Level."
          />
        </div>
      </section>

      {bonusRows.length > 0 ? (
        <>
          <hr className="mb-4 border-0 border-t border-swg-black/15" />
          <section>
            <h3 className="m-0 mb-3 text-center font-text text-xs font-bold uppercase tracking-[0.12em] text-swg-black">
              Bonuspunkte
            </h3>
            <ul className="m-0 grid list-none grid-cols-2 gap-2.5 p-0">
              {bonusRows.map((row) => {
                const missionBonus = missionBonusCatalog.get(row.id);
                const fallback = getLevelBonusCategoryMeta(row.id);
                return (
                  <MissionBonus
                    key={row.id}
                    type={row.id}
                    name={missionBonus?.title ?? fallback.label}
                    imageUrl={missionBonus?.imageUrl ?? null}
                    imageAlt={missionBonus?.imageAlt ?? fallback.label}
                  />
                );
              })}
            </ul>
          </section>
        </>
      ) : null}
    </>
  );
}
