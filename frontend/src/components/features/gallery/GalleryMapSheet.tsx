import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { GalleryOverview } from "@/components/features/gallery/GalleryOverview";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useBottomSheet } from "@/hooks/useBottomSheet";
import type { AsyncResourceState } from "@/hooks/useAsyncResource";
import { isStrapiConfigured } from "@/lib/env";
import { subscribeLevelProgress } from "@/features/level/levelProgress";
import type { District } from "@/types/content";
import { cn } from "@/lib/cn";

type Props = {
  open: boolean;
  districts: District[];
  districtsResource: AsyncResourceState<District[]>;
  initialLevelKey?: string | null;
};

export function GalleryMapSheet({
  open,
  districts,
  districtsResource,
  initialLevelKey,
}: Props) {
  const reducedMotion = usePrefersReducedMotion();
  const [progressRevision, setProgressRevision] = useState(0);

  const {
    visible,
    sheetMotionClass,
    enterTransitionMs,
    enterEaseClass,
    handleSheetTransitionEnd,
  } = useBottomSheet({ open, reducedMotion });

  useEffect(() => {
    if (!open) {
      return;
    }
    return subscribeLevelProgress(() => setProgressRevision((r) => r + 1));
  }, [open]);

  if (!visible) {
    return null;
  }

  let scrollContent: ReactNode;
  if (
    districtsResource.status === "loading" ||
    districtsResource.status === "idle"
  ) {
    scrollContent = (
      <p className="px-4 py-6 text-center font-text text-swg-black">
        Galerie wird geladen …
      </p>
    );
  } else if (districtsResource.status === "error") {
    scrollContent = (
      <p className="px-4 py-6 text-center font-text text-red-900">
        {districtsResource.error.message}
      </p>
    );
  } else if (districts.length === 0) {
    scrollContent = (
      <p className="px-4 py-6 text-center font-text text-swg-black">
        {isStrapiConfigured()
          ? "Keine Bezirke vom CMS geladen."
          : "Bezirke können online nicht geladen werden."}
      </p>
    );
  } else {
    scrollContent = (
      <GalleryOverview
        districts={districts}
        initialLevelKey={initialLevelKey}
        progressRevision={progressRevision}
        presentation="sheet"
      />
    );
  }

  return (
    <div className="pointer-events-auto absolute inset-0 z-0 flex min-h-0 flex-col overflow-hidden">
      <div
        className={cn(
          "flex h-full min-h-0 w-full flex-1 flex-col bg-swg-bg will-change-transform transition-transform motion-reduce:transition-none",
          enterEaseClass,
          sheetMotionClass,
        )}
        style={{ transitionDuration: `${enterTransitionMs}ms` }}
        onTransitionEnd={handleSheetTransitionEnd}
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          {scrollContent}
        </div>
      </div>
    </div>
  );
}
