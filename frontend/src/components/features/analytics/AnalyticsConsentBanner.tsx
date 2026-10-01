import { useEffect, useState, type UIEvent } from "react";
import { StrapiBlocksView } from "@/components/features/strapi/StrapiBlocksView";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { OverlayPortal } from "@/components/ui/OverlayPortal";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/cn";
import type { ConsentContent } from "@/types/content";

/** Anfänglich sichtbare Höhe einschließlich Footer; Scrollen öffnet das Sheet vollständig. */
const CONSENT_SHEET_PEEK_MAX_HEIGHT = "50dvh";
/** Feste dvh-Werte erlauben die Animation von height und max-height. */
const CONSENT_SHEET_EXPANDED_MAX_HEIGHT = "90dvh";

const CONSENT_SHEET_HEIGHT_TRANSITION =
  "transition-[height,max-height] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";

type AnalyticsConsentBannerProps = {
  open: boolean;
  content: ConsentContent;
  onAccept: () => void;
  onDeny: () => void;
};

/**
 * Einwilligung zur Statistik als Bottom-Sheet mit Inhalt aus settings.consent.
 * Eine Entscheidung erfolgt über die beiden Schaltflächen; der Hintergrund schließt das Sheet nicht.
 * Beim ersten Scrollen wächst die Höhe von 50dvh auf 90dvh.
 */
export function AnalyticsConsentBanner({
  open,
  content,
  onAccept,
  onDeny,
}: AnalyticsConsentBannerProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!open) {
      setExpanded(false);
    }
  }, [open]);

  const handleBodyScroll = (event: UIEvent<HTMLDivElement>) => {
    if (expanded) {
      return;
    }
    if (event.currentTarget.scrollTop > 0) {
      setExpanded(true);
    }
  };

  const heightTransitionClass = reducedMotion
    ? ""
    : CONSENT_SHEET_HEIGHT_TRANSITION;

  return (
    <OverlayPortal>
      <BottomSheet
        open={open}
        reducedMotion={reducedMotion}
        size="full"
        rootClassName="z-(--z-menu-top)"
        anchorClassName={heightTransitionClass}
        panelClassName={cn(
          "rounded-t-[1.35rem] bg-white px-5 pt-6 shadow-xl",
          heightTransitionClass,
        )}
        backdropClassName="pointer-events-auto bg-slate-900/55 backdrop-blur-[2px]"
        bodyClassName="pb-2"
        footerClassName="bg-white px-5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-1"
        sheetMaxHeight={
          expanded
            ? CONSENT_SHEET_EXPANDED_MAX_HEIGHT
            : CONSENT_SHEET_PEEK_MAX_HEIGHT
        }
        labelledBy="analytics-consent-title"
        onBodyScroll={handleBodyScroll}
        footer={
          <div className="flex flex-col gap-2.5">
            <Button block shape="pill" onClick={onAccept}>
              {content.acceptButton}
            </Button>
            <Button
              block
              shape="pill"
              variant="white"
              className="border-2 border-swg-blue-dark"
              onClick={onDeny}
            >
              {content.denyButton}
            </Button>
          </div>
        }
      >
        <h2 id="analytics-consent-title" className="sr-only">
          Statistik-Einwilligung
        </h2>
        <div className="font-text text-default leading-snug [&_a]:underline">
          <StrapiBlocksView blocks={content.content} emptyLabel="" />
        </div>
      </BottomSheet>
    </OverlayPortal>
  );
}
