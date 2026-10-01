import { Suspense } from "react";
import { useLocation, useOutlet } from "react-router-dom";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { outletTransitionKey } from "@/components/layout/outletTransitionKey";
import { FullscreenLoadingScreen } from "@/components/ui/FullscreenLoadingScreen";
import { cn } from "@/lib/cn";

type AnimatedOutletProps = {
  /** Umschließt die aktive Route; standardmäßig in voller Größe des Hauptbereichs. */
  className?: string;
};

/**
 * Animiert den Einstieg beim Wechsel der Hauptseite.
 * Untergeordnete Karten- oder Levelrouten lösen keinen erneuten Seiteneinstieg aus.
 */
export function AnimatedOutlet({
  className = "absolute inset-0 min-h-0 w-full flex flex-col overflow-hidden overscroll-none",
}: AnimatedOutletProps) {
  const location = useLocation();
  const outlet = useOutlet();
  const reducedMotion = usePrefersReducedMotion();
  const transitionKey = outletTransitionKey(location.pathname);

  if (outlet == null) {
    return null;
  }

  return (
    <div
      key={transitionKey}
      className={cn(
        className,
        !reducedMotion && "animate-page-enter motion-reduce:animate-none",
      )}
    >
      <Suspense fallback={<FullscreenLoadingScreen />}>{outlet}</Suspense>
    </div>
  );
}
