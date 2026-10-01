import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { CelebrationRays } from "@/components/ui/CelebrationRays";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { GeschenkIcon } from "@/internal_assets/icons/GeschenkIcon";
import { cn } from "@/lib/cn";
import { playSound } from "@/lib/sound/globalSound";
import type { District } from "@/types/content";

type Props = {
  district: District;
  onDismiss: () => void;
};

export function MapBonusLevelUnlockOverlay({ district, onDismiss }: Props) {
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    playSound("bonus.unlock.map");
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center px-5"
      role="presentation"
    >
      <button
        type="button"
        className="pointer-events-auto absolute inset-0 cursor-default border-0 bg-[rgb(55_81_114/0.18)] p-0"
        aria-label="Schließen"
        onClick={onDismiss}
      />

      <div
        className={cn(
          "map-bonus-unlock-overlay__panel pointer-events-auto relative z-1 w-full max-w-[min(100%,20.5rem)] overflow-hidden rounded-2xl border-[3px] border-swg-blue-dark bg-white shadow-[0_10px_28px_rgb(55_81_114/0.22)]",
          reducedMotion && "map-bonus-unlock-overlay__panel--instant",
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="map-bonus-unlock-title"
      >
        <div className="map-bonus-unlock-overlay__hero relative overflow-hidden pt-2 pb-2">
          <div className="relative z-10 flex flex-col items-center px-5">
            <div className="map-bonus-unlock-overlay__preview relative size-[7.5rem] shrink-0">
              <CelebrationRays reducedMotion={reducedMotion} />
              <div
                className={cn(
                  "relative z-10 flex size-full items-center justify-center",
                  !reducedMotion && "map-bonus-unlock-overlay__gift-pulse",
                )}
              >
                <GeschenkIcon className="block h-[5.5rem] w-auto max-w-full" />
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 px-5 pb-6">
          <p
            id="map-bonus-unlock-title"
            className="m-0 mt-3 mb-3 text-center font-display text-[1.35rem] leading-tight text-swg-black"
          >
            Neues Bonus-Level in <br />
            {district.name} freigespielt!
          </p>
          <Button block onClick={onDismiss}>
            Alles klar!
          </Button>
        </div>
      </div>
    </div>
  );
}
