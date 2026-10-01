import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/routes/paths";
import { Button } from "@/components/ui/Button";
import {
  collectGalleryEntries,
  type GalleryEntry,
} from "@/features/gallery/collectGalleryEntries";
import { getGalleryComboUrlsForEntry } from "@/features/gallery/getGalleryComboUrlsForEntry";
import { GalleryCard } from "@/components/features/gallery/GalleryCard";
import { GalleryEntrySheet } from "@/components/features/gallery/GalleryEntrySheet";
import { levelMatchesRouteParam } from "@/features/level/levelProgress";
import type { District } from "@/types/content";
import { cn } from "@/lib/cn";

type Props = {
  districts: District[];
  /** Öffnet bei einem direkten Level-Link das zugehörige Sheet. */
  initialLevelKey?: string | null;
  progressRevision?: number;
  presentation?: "sheet" | "page";
};

export function GalleryOverview({
  districts,
  initialLevelKey,
  progressRevision = 0,
  presentation = "page",
}: Props) {
  const navigate = useNavigate();
  const entries = useMemo(
    () => collectGalleryEntries(districts),
    [districts, progressRevision],
  );
  const inSheet = presentation === "sheet";

  const activeEntry = useMemo(() => {
    const key = initialLevelKey?.trim();
    if (!key) {
      return null;
    }
    return (
      entries.find(
        (entry) =>
          entry.levelKey === key || levelMatchesRouteParam(entry.level, key),
      ) ?? null
    );
  }, [entries, initialLevelKey]);

  const openSheet = (entry: GalleryEntry) => {
    navigate(ROUTES.gallerieLevel(entry.levelKey));
  };

  const closeSheet = () => {
    navigate(ROUTES.gallerie, { replace: true });
  };

  return (
    <>
      <section
        className={cn(
          inSheet
            ? "block w-full min-h-0 flex-none overflow-visible px-4 pt-3 pb-4"
            : "mx-auto flex max-w-[360px] min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-[calc(1rem+env(safe-area-inset-bottom,0px))]",
        )}
        aria-labelledby="gallery-overview-title"
      >
        <h1 id="gallery-overview-title" className="sr-only">
          Galerie
        </h1>

        <ul className="m-0 grid list-none grid-cols-[minmax(0,1fr)] content-start gap-[0.85rem] p-0">
          {entries.map((entry) => (
            <li key={entry.levelKey} className="min-w-0">
              <GalleryCard
                entry={entry}
                combo={getGalleryComboUrlsForEntry(entry)}
                onActivate={() => openSheet(entry)}
              />
            </li>
          ))}
        </ul>

        {!inSheet ? (
          <footer className="mt-5 flex flex-col items-center gap-[0.85rem] pt-2">
            <Button
              grow
              className="max-w-full"
              onClick={() => navigate(ROUTES.map)}
            >
              Schließen
            </Button>
          </footer>
        ) : null}
      </section>

      {activeEntry ? (
        <GalleryEntrySheet
          entry={activeEntry}
          open
          onClose={closeSheet}
        />
      ) : null}
    </>
  );
}
