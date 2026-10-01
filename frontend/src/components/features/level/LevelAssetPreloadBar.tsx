type Props = {
  progress: number;
  visible: boolean;
};

/** Ladefortschritt der Levelmedien unter dem Missionsheader. */
export function LevelAssetPreloadBar({ progress, visible }: Props) {
  if (!visible) {
    return null;
  }

  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100);

  return (
    <div
      className="shrink-0 border-b border-swg-black/10 bg-swg-bg"
      aria-hidden={pct >= 100}
    >
      <div
        className="h-2 overflow-hidden bg-white/10"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label="Level-Assets laden"
      >
        <span
          className="block h-full bg-swg-green-light transition-[width] duration-150 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
