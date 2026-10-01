import {
  useRef,
  type ReactNode,
  type Ref,
  type UIEventHandler,
} from "react";
import { useBottomSheet } from "@/hooks/useBottomSheet";
import { useModalAssistiveHide } from "@/hooks/useModalAssistiveHide";
import { cn } from "@/lib/cn";

type BottomSheetSize = "full" | "fitContent";

type BottomSheetProps = {
  open: boolean;
  reducedMotion?: boolean;
  /** fitContent passt die Höhe an den Inhalt an und begrenzt sie auf den sichtbaren Bereich. */
  size?: BottomSheetSize;
  /**
   * Positionierung der Root-Ebene. `absolute` für In-Viewport-Sheets
   * (Phone-Frame), `fixed` wenn per Portal auf `document.body`.
   */
  position?: "absolute" | "fixed";
  /** Zusätzliche Klassen für das äußere Dialogelement. */
  rootClassName?: string;
  /** Zusätzliche Klassen für das Panel. */
  panelClassName?: string;
  /** Zusätzliche Klassen für den Anker des Sheets. */
  anchorClassName?: string;
  /** Zusätzliche Klassen für den abgedunkelten Hintergrund. */
  backdropClassName?: string;
  /** Zusätzliche Klassen für den Footer. */
  footerClassName?: string;
  /** Inhalt über dem Panel, etwa ein überlappendes Maskottchen. */
  topSlot?: ReactNode;
  /** Überlappung des oberen Inhalts; der Innenabstand des Panels wird entsprechend angepasst. */
  topSlotOverlap?: string;
  /** Zusätzliche Klassen für den oberen Inhaltsbereich. */
  topSlotClassName?: string;
  /** Zusätzliche Klassen für den scrollbaren Inhalt. */
  bodyClassName?: string;
  /** Maximale Inhaltshöhe bei fitContent; standardmäßig min(70dvh,100%). */
  fitContentBodyMaxHeight?: string;
  /** Maximale Höhe von Anker und Panel; standardmäßig min(90dvh,100%). */
  sheetMaxHeight?: string;
  /** Zugänglicher Name, falls keine zugeordnete Überschrift vorhanden ist. */
  ariaLabel?: string;
  labelledBy?: string;
  onBackdropClick?: () => void;
  /** Scrollereignisse aus dem Inhalt, etwa zum Vergrößern des Sheets. */
  onBodyScroll?: UIEventHandler<HTMLDivElement>;
  /** false lässt den Hintergrund sichtbar; standardmäßig wird er abgedunkelt. */
  showBackdrop?: boolean;
  /** Vollflächiger Inhalt zwischen Hintergrund und Panel, etwa Konfetti. */
  overlayAboveBackdrop?: ReactNode;
  /** Ref des Panels zur Messung des Layouts. */
  panelRef?: Ref<HTMLDivElement>;
  enterDelayMs?: number;
  enterDurationMs?: number;
  enterTimingLinear?: boolean;
  onClosed?: () => void;
  /** Wird einmal nach dem Einblenden aufgerufen, bei reduzierten Animationen sofort. */
  onEntered?: () => void;
  /** Mit Footer: auto erlaubt Scrollen; hidden hält den Footer fest und erfordert ein eigenes Innenlayout. */
  footerBodyScroll?: "auto" | "hidden";
  footer?: ReactNode;
  children: ReactNode;
};

/**
 * Gemeinsames Bottom-Sheet mit konfigurierbarem Layout, Hintergrund und Einblendung.
 */
export function BottomSheet({
  open,
  reducedMotion = false,
  size = "full",
  position = "absolute",
  rootClassName = "",
  panelClassName = "",
  anchorClassName = "",
  backdropClassName = "",
  footerClassName = "",
  topSlot,
  topSlotOverlap = "3rem",
  topSlotClassName = "pointer-events-none relative z-[11] flex shrink-0 justify-center items-end px-4",
  bodyClassName = "",
  fitContentBodyMaxHeight = "min(70dvh,100%)",
  sheetMaxHeight = "min(90dvh,100%)",
  ariaLabel,
  labelledBy,
  onBackdropClick,
  onBodyScroll,
  showBackdrop = true,
  overlayAboveBackdrop,
  panelRef,
  enterDelayMs,
  enterDurationMs,
  enterTimingLinear,
  onClosed,
  onEntered,
  footerBodyScroll = "auto",
  footer,
  children,
}: BottomSheetProps) {
  const {
    visible,
    sheetMotionClass,
    sheetTransitionClass,
    sheetWillChangeClass,
    backdropMotionClass,
    enterTransitionMs,
    enterEaseClass,
    handleSheetTransitionEnd,
  } = useBottomSheet({
    open,
    reducedMotion,
    enterDelayMs,
    enterDurationMs,
    enterTimingLinear,
    onClosed,
    onEntered,
  });

  const dialogRef = useRef<HTMLDivElement>(null);
  useModalAssistiveHide(visible, dialogRef);

  if (!visible) {
    return null;
  }

  const fitContent = size === "fitContent";
  const hasFooter = footer != null;
  /** Footer bleibt am unteren Viewport-Rand; Inhalt scrollt darüber. */
  const stickyScreenFooter = hasFooter;
  /** Mit size: full und Footer füllt das Panel die gesamte verfügbare Höhe. */
  const fillViewport = !fitContent && stickyScreenFooter;

  const sheetPanelClass = stickyScreenFooter
    ? fillViewport
      ? "flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden"
      : "flex min-h-0 w-full flex-col overflow-hidden"
    : fitContent
      ? "flex min-h-0 w-full flex-col"
      : "flex min-h-0 max-h-full w-full flex-col";

  const sheetPanelStyle =
    stickyScreenFooter || fitContent
      ? fillViewport
        ? { height: sheetMaxHeight, maxHeight: sheetMaxHeight, minHeight: 0 }
        : { maxHeight: sheetMaxHeight }
      : undefined;

  const bodyScrollClass = stickyScreenFooter
    ? footerBodyScroll === "hidden"
      ? "min-h-0 flex-1 overflow-hidden overscroll-contain"
      : "min-h-0 flex-1 overflow-y-auto overscroll-contain"
    : fitContent
      ? "min-h-0 shrink-0 overflow-y-auto overscroll-contain"
      : "min-h-0 flex-1 overflow-y-auto";

  const sheetAnchorClass = cn(
    "bottom-sheet__anchor pointer-events-none absolute inset-x-0 bottom-0 z-10 flex w-full flex-col",
    stickyScreenFooter
      ? // Die Höhe über sheetMaxHeight steuern; top-0 würde kleinere Sheets am oberen Rand befestigen.
        "min-h-0"
      : fitContent
        ? "max-h-full"
        : "top-0 min-h-0 justify-end",
    topSlot ? "overflow-visible" : "overflow-hidden",
    anchorClassName,
  );

  const sheetAnchorStyle = stickyScreenFooter
    ? fillViewport
      ? { height: sheetMaxHeight, maxHeight: sheetMaxHeight }
      : { maxHeight: sheetMaxHeight }
    : undefined;

  const motionWrapperClass = cn(
    "pointer-events-auto flex w-full flex-col items-stretch motion-reduce:transition-none motion-reduce:duration-0",
    sheetTransitionClass,
    sheetWillChangeClass,
    stickyScreenFooter
      ? fillViewport
        ? "h-full min-h-0 w-full flex-1"
        : "min-h-0 max-h-full w-full"
      : fitContent
        ? "w-full shrink-0"
        : "min-h-0 max-h-full flex-1 justify-end",
    enterEaseClass,
    sheetMotionClass,
  );

  const bodyStyle = stickyScreenFooter
    ? topSlot
      ? { paddingTop: topSlotOverlap }
      : undefined
    : fitContent
      ? {
          maxHeight: fitContentBodyMaxHeight,
          ...(topSlot ? { paddingTop: topSlotOverlap } : {}),
        }
      : topSlot
        ? { paddingTop: topSlotOverlap }
        : undefined;

  const enterMotionStyle = {
    transitionDuration: `${enterTransitionMs}ms`,
  } as const;

  /** Ohne Hintergrundaktion nur abdunkeln und Klicks am Panel durchlassen. */
  const backdropPointerClass = onBackdropClick
    ? "pointer-events-auto"
    : "pointer-events-none";

  const backdropLayerClass = cn(
    "inset-0 z-0 bg-slate-900/45 transition-opacity motion-reduce:transition-none",
    position === "fixed" ? "fixed" : "absolute",
    backdropPointerClass,
    enterEaseClass,
    backdropMotionClass,
    backdropClassName,
  );

  return (
    <div
      ref={dialogRef}
      className={cn(
        "pointer-events-auto inset-0 z-50",
        position === "fixed" ? "fixed" : "absolute",
        topSlot ? "overflow-visible" : "overflow-hidden",
        rootClassName,
      )}
      role="dialog"
      aria-modal="true"
      aria-label={labelledBy ? undefined : ariaLabel}
      aria-labelledby={labelledBy}
    >
      {showBackdrop ? (
        onBackdropClick ? (
          <button
            type="button"
            className={cn(backdropLayerClass, "border-0")}
            style={enterMotionStyle}
            aria-label="Schließen"
            onClick={onBackdropClick}
          />
        ) : (
          <div
            className={backdropLayerClass}
            style={enterMotionStyle}
            aria-hidden
          />
        )
      ) : null}
      {overlayAboveBackdrop ? (
        <div
          className="pointer-events-none absolute inset-0 z-[1] overflow-hidden"
          aria-hidden
        >
          {overlayAboveBackdrop}
        </div>
      ) : null}
      <div className={sheetAnchorClass} style={sheetAnchorStyle}>
        <div
          className={motionWrapperClass}
          style={enterMotionStyle}
          onTransitionEnd={handleSheetTransitionEnd}
        >
          {topSlot ? (
            <div
              className={cn(topSlotClassName, "shrink-0")}
              style={{ marginBottom: `calc(-1 * ${topSlotOverlap})` }}
            >
              {topSlot}
            </div>
          ) : null}
          <div
            ref={panelRef}
            className={cn(
              "pointer-events-auto relative z-10 flex w-full flex-col bg-swg-bg",
              sheetPanelClass,
              panelClassName,
            )}
            style={sheetPanelStyle}
          >
            <div
              className={cn(bodyScrollClass, bodyClassName)}
              style={bodyStyle}
              onScroll={onBodyScroll}
            >
              {children}
            </div>
            {footer ? (
              <footer
                className={cn(
                  "shrink-0 bg-swg-bg pb-[env(safe-area-inset-bottom,0px)]",
                  footerClassName,
                )}
              >
                {footer}
              </footer>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
