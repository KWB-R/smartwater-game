const MAX_FILLED = 3;

type TileDetailMissionProgressBarProps = {
  filled: number;
  showBonus?: boolean;
  reducedMotion?: boolean;
};

export function TileDetailMissionProgressBar({
  filled,
  showBonus = false,
  reducedMotion = false,
}: TileDetailMissionProgressBarProps) {
  const clamped = Math.min(MAX_FILLED, Math.max(0, filled));
  const percent = (clamped / MAX_FILLED) * 100;

  return (
    <div
      className="tile-detail-mission-progress relative h-6 w-[5.75rem] shrink-0 overflow-hidden rounded-full border-1 border-swg-black bg-white"
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={MAX_FILLED}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-swg-green-light"
        style={{
          width: `${percent}%`,
          transition: reducedMotion
            ? undefined
            : "width 0.55s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
      {showBonus ? (
        <span className="relative z-[1] flex h-full w-full items-center justify-center font-display text-[0.62rem] leading-none font-medium tracking-wide text-swg-black uppercase">
          +1 Bonus
        </span>
      ) : null}
    </div>
  );
}
