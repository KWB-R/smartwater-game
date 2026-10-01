/** Missionsbezeichnung oben rechts; das Elternelement benötigt position: relative. */
export function MissionCategoryBadge() {
  return (
    <div className="absolute top-[-15px] left-[65px] z-[1]">
      <span className="rounded bg-swg-purple px-1.5 py-0.5 font-display text-[0.7rem] tracking-wide text-white uppercase">
        Ziel
      </span>
    </div>
  );
}
