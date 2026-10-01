import { useState } from "react";
import { fetchDistricts } from "@/api/services/bezirkService";
import { districtRouteId } from "@/features/map/berlinMapLayout";
import { isLevelVisibleOnMap } from "@/features/map/mapBonusLevelUnlock";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { useReloadOnOnline } from "@/hooks/useOfflineStatus";
import { levelProgressKey, levelRouteSlug } from "@/features/level/levelProgress";
import { ChevronDownIcon } from "@/internal_assets/icons/ChevronDownIcon";
import { GeschenkIcon } from "@/internal_assets/icons/GeschenkIcon";
import { ROUTES } from "@/routes/paths";

const MENU_ITEM_CLASS = "border-b border-[rgb(127_190_235/0.45)]";

const SUMMARY_CLASS =
  "flex w-full cursor-pointer list-none items-center justify-between gap-3 px-1 py-[0.95rem] text-left font-text leading-tight text-inherit focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-swg-blue-mid [&::-webkit-details-marker]:hidden";

const LEVEL_BUTTON_CLASS =
  "w-full cursor-pointer border-0 bg-transparent py-[0.55rem] px-1 text-left font-text text-[0.92rem] leading-snug text-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-swg-blue-mid";

const LEVEL_BUTTON_BONUS_CLASS = `${LEVEL_BUTTON_CLASS} inline-flex items-center gap-1.5`;

type MainMenuAllLevelsAccordionProps = {
  onNavigate: (to: string) => void;
};

function MainMenuAllLevelsList({
  onNavigate,
}: {
  onNavigate: (to: string) => void;
}) {
  const districtsResource = useAsyncResource(fetchDistricts, []);
  useReloadOnOnline(districtsResource.reload);

  if (
    districtsResource.status === "idle" ||
    districtsResource.status === "loading"
  ) {
    return (
      <p className="m-0 px-1 py-2 font-text text-[0.92rem] text-white/75">
        Level werden geladen …
      </p>
    );
  }

  if (districtsResource.status === "error") {
    return (
      <div className="px-1 py-2">
        <p className="m-0 font-text text-[0.92rem] text-white/75">
          Bezirke konnten nicht geladen werden.
        </p>
        <button
          type="button"
          className="mt-2 cursor-pointer border-0 bg-transparent p-0 font-text text-[0.92rem] text-white underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-swg-blue-mid"
          onClick={() => districtsResource.reload()}
        >
          Erneut versuchen
        </button>
      </div>
    );
  }

  // Bezirke alphabetisch; Bonuslevel (primaryLevel === false) direkt unter Hauptlevel.
  const levelEntries = [...districtsResource.data]
    .sort((a, b) => a.name.localeCompare(b.name, "de"))
    .flatMap((district) => {
      const routeId = districtRouteId(district);
      const primaryLevels = district.levels
        .filter((level) => level.primaryLevel !== false)
        .sort((a, b) => a.name.localeCompare(b.name, "de"));
      const bonusLevels = district.levels
        .filter(
          (level) =>
            level.primaryLevel === false &&
            isLevelVisibleOnMap(district, level),
        )
        .sort((a, b) => a.name.localeCompare(b.name, "de"));

      return [...primaryLevels, ...bonusLevels].map((level) => ({
        key: `${routeId}-${levelProgressKey(level)}`,
        name: level.name,
        to: ROUTES.mapDistrictLevelDetail(routeId, levelRouteSlug(level)),
        isBonusLevel: level.primaryLevel === false,
      }));
    });

  if (levelEntries.length === 0) {
    return (
      <p className="m-0 px-1 py-2 font-text text-[0.92rem] text-white/75">
        Keine Level verfügbar.
      </p>
    );
  }

  return (
    <ul className="m-0 list-none p-0 pb-2 pl-2">
      {levelEntries.map((entry) => (
        <li key={entry.key}>
          <button
            type="button"
            className={
              entry.isBonusLevel ? LEVEL_BUTTON_BONUS_CLASS : LEVEL_BUTTON_CLASS
            }
            onClick={() => onNavigate(entry.to)}
          >
            {entry.isBonusLevel ? (
              <>
                <GeschenkIcon
                  className="mr-1.5 inline-block h-[20px] w-[20px] shrink-0 align-[-0.35em]"
                  aria-hidden
                />
                <span>{entry.name}</span>
              </>
            ) : (
              entry.name
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function MainMenuAllLevelsAccordion({
  onNavigate,
}: MainMenuAllLevelsAccordionProps) {
  const [open, setOpen] = useState(false);

  return (
    <li className={MENU_ITEM_CLASS}>
      <details
        className="group"
        open={open}
        onToggle={(event) => setOpen(event.currentTarget.open)}
      >
        <summary className={SUMMARY_CLASS}>
          <span>Alle Bezirke</span>
          <ChevronDownIcon className="block w-[1rem] h-[1rem] shrink-0 transition-transform group-open:rotate-180" />
        </summary>
        {open ? <MainMenuAllLevelsList onNavigate={onNavigate} /> : null}
      </details>
    </li>
  );
}
