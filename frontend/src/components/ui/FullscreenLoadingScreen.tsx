import { OverlayPortal } from "@/components/ui/OverlayPortal";
import waitingIllustrationUrl from "@/internal_assets/icons/waiting_1_animated.svg";

type Props = {
  /** 0–1, optionaler Fortschrittsbalken unter dem Text */
  progress?: number;
  /** Direkt im App-Viewport rendern, solange dessen DOM-Knoten noch nicht verfügbar ist. */
  inline?: boolean;
};

const LOADING_LABEL = "Inhalte werden geladen";

export function FullscreenLoadingScreen({ progress, inline = false }: Props) {
  const clampedProgress =
    typeof progress === "number" && Number.isFinite(progress)
      ? Math.min(1, Math.max(0, progress))
      : undefined;
  const determinate =
    clampedProgress !== undefined &&
    clampedProgress > 0 &&
    clampedProgress < 1;
  const pct = determinate ? Math.round(clampedProgress * 100) : undefined;

  const screen = (
    <div
      className={`${inline ? "absolute" : "fixed"} inset-0 z-(--z-loading-screen) flex items-center justify-center bg-swg-bg p-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]`}
      role="status"
      aria-live="polite"
    >
      {/* Platz für das Maskottchen oberhalb der Karte reservieren. */}
      <div className="relative w-full max-w-[min(100%,25rem)] pt-40">
        <div className="relative flex flex-col items-center rounded-xl bg-white px-6 py-5 text-center">
          <img
            src={waitingIllustrationUrl}
            alt=""
            aria-hidden
            draggable={false}
            className="pointer-events-none absolute top-0 left-1/2 z-10 h-auto w-40 -translate-x-1/2 -translate-y-[95%] select-none"
            width={160}
            height={154}
          />
          <p className="m-0 font-text text-base font-base leading-tight text-swg-blue-dark">
            {LOADING_LABEL}
          </p>
          <div
            className="mt-4 h-2 w-full overflow-hidden rounded-full bg-swg-bg"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={determinate ? pct : undefined}
            aria-valuetext={determinate ? `${pct} Prozent` : "Laden …"}
            aria-label="Ladefortschritt"
          >
            {determinate ? (
              <span
                className="block h-full rounded-full bg-swg-green-light transition-[width] duration-150 ease-out"
                style={{ width: `${pct}%` }}
              />
            ) : (
              <span className="block h-full w-[42%] rounded-full bg-swg-green-light animate-level-tile-thumb-progress-scan" />
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return inline ? screen : <OverlayPortal>{screen}</OverlayPortal>;
}
