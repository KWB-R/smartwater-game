import { cn } from "@/lib/cn";
import { Link } from "react-router-dom";
import { ROUTES } from "@/routes/paths";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

type Props = {
  galleryActive: boolean;
  className?: string;
};

export function MapViewTabs({ galleryActive, className }: Props) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div
      className={cn("map-view-tabs", className)}
      role="tablist"
      aria-label="Kartenansicht wechseln"
    >
      <span
        className={cn(
          "map-view-tabs__indicator",
          galleryActive && "map-view-tabs__indicator--gallery",
          reducedMotion && "map-view-tabs__indicator--instant",
        )}
        aria-hidden
      />
      <Link
        to={ROUTES.map}
        viewTransition
        role="tab"
        aria-selected={!galleryActive}
        data-sound="button.click"
        className={cn(
          "map-view-tabs__tab",
          !galleryActive && "map-view-tabs__tab--active",
        )}
      >
        Berlin-Karte
      </Link>
      <Link
        to={ROUTES.gallerie}
        state={null}
        viewTransition
        role="tab"
        aria-selected={galleryActive}
        data-sound="button.click"
        className={cn(
          "map-view-tabs__tab",
          galleryActive && "map-view-tabs__tab--active",
        )}
      >
        Galerie
      </Link>
    </div>
  );
}
