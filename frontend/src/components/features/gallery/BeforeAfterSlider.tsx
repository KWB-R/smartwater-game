import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/cn";

function BeforeAfterHandleChevron({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M15 5L9 12L15 19"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const INTRO_HOLD_MS = 1_400;
const INTRO_SLIDE_MS = 900;
/** Ohne Beschriftung etwa zehn Prozent Abstand vom linken sichtbaren Rand lassen. */
const INTRO_END_VIEWPORT_FRACTION = 0.1;
/** Abstand zwischen Vorher-Beschriftung und Schieber. */
const INTRO_AFTER_LABEL_GAP_PX = 26;
/** Halbe Breite der Bedienfläche; die Schiebermitte bleibt dadurch vom Rand entfernt. */
export const BEFORE_AFTER_HANDLE_HIT_HALF_WIDTH_PX = 24;

export type BeforeAfterSliderClipInsets = {
  /** Links außerhalb des sichtbaren Bereichs liegende Breite in Pixeln. */
  leftPx: number;
  /** Rechts außerhalb des sichtbaren Bereichs liegende Breite in Pixeln. */
  rightPx: number;
};

function ancestorClipsHorizontalOverflow(element: HTMLElement): boolean {
  const { overflow, overflowX } = getComputedStyle(element);
  return (
    overflow === "hidden" ||
    overflow === "clip" ||
    overflowX === "hidden" ||
    overflowX === "clip"
  );
}

/**
 * Sichtbarer horizontaler Ausschnitt des Vergleichs.
 * Im Level kann das Brett mit 100cqh breiter sein als die Szene mit 100cqw.
 */
function resolveBeforeAfterSliderClipInsets(
  container: HTMLElement,
  containerRect = container.getBoundingClientRect(),
): BeforeAfterSliderClipInsets {
  let leftPx = 0;
  let rightPx = 0;

  let ancestor: HTMLElement | null = container.parentElement;
  while (ancestor) {
    if (ancestorClipsHorizontalOverflow(ancestor)) {
      const clipRect = ancestor.getBoundingClientRect();
      leftPx = Math.max(leftPx, clipRect.left - containerRect.left);
      rightPx = Math.max(rightPx, containerRect.right - clipRect.right);
    }
    ancestor = ancestor.parentElement;
  }

  const viewport = window.visualViewport;
  const viewportLeft = viewport?.offsetLeft ?? 0;
  const viewportWidth = viewport?.width ?? document.documentElement.clientWidth;
  const viewportRight = viewportLeft + viewportWidth;
  leftPx = Math.max(leftPx, viewportLeft - containerRect.left);
  rightPx = Math.max(rightPx, containerRect.right - viewportRight);

  return { leftPx, rightPx };
}

/** Position von 0 bis 1 für den Schieber; die Trennlinie darf bis zum Brettrand reichen. */
export function clampBeforeAfterSliderPosition(
  ratio: number,
  containerWidthPx: number,
  clipInsets: BeforeAfterSliderClipInsets = { leftPx: 0, rightPx: 0 },
): number {
  if (containerWidthPx <= 0) {
    return Math.min(1, Math.max(0, ratio));
  }
  const handleHalf = BEFORE_AFTER_HANDLE_HIT_HALF_WIDTH_PX;
  const minPx = clipInsets.leftPx + handleHalf;
  const maxPx = containerWidthPx - clipInsets.rightPx - handleHalf;
  if (maxPx <= minPx) {
    return 0.5;
  }
  const min = minPx / containerWidthPx;
  const max = maxPx / containerWidthPx;
  return Math.min(max, Math.max(min, ratio));
}

function clampRevealRatio(ratio: number): number {
  return Math.min(1, Math.max(0, ratio));
}

/**
 * Rechnet die horizontale Position im sichtbaren Bereich in eine Slider-Position von 0 bis 1 um.
 */
function introEndPositionFromViewport(
  container: HTMLElement,
  viewportFraction = INTRO_END_VIEWPORT_FRACTION,
): number {
  const rect = container.getBoundingClientRect();
  if (rect.width <= 0) {
    return viewportFraction;
  }
  const viewportWidth =
    window.visualViewport?.width ?? document.documentElement.clientWidth;
  const targetClientX = viewportWidth * viewportFraction;
  return Math.min(1, Math.max(0, (targetClientX - rect.left) / rect.width));
}

/**
 * Beendet die Einstiegsanimation hinter der Vorher-Beschriftung.
 * Abstand und Textbreite bestimmen die Position unabhängig von clip-path.
 */
function introEndPositionForBeforeLabel(
  container: HTMLElement,
  beforeLabel: HTMLElement | null,
): number {
  if (!beforeLabel || container.clientWidth <= 0) {
    return introEndPositionFromViewport(container);
  }
  const row = beforeLabel.parentElement;
  const padLeft = row
    ? Number.parseFloat(getComputedStyle(row).paddingLeft) || 0
    : 0;
  const endPx = padLeft + beforeLabel.offsetWidth + INTRO_AFTER_LABEL_GAP_PX;
  return Math.min(1, Math.max(0, endPx / container.clientWidth));
}

/**
 * Gemeinsame Animation für Maske und Schieber mit cubic-bezier(0.22, 1, 0.36, 1).
 */
function easeIntroSlide(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  const inv = 1 - clamped;
  return 1 - inv * inv * inv * inv;
}

type Props = {
  beforeSrc: string | null;
  afterSrc?: string | null;
  beforeAlt?: string;
  afterAlt?: string;
  /** Ersetzt `afterSrc`, z. B. Bild + Video-Loop. */
  afterContent?: ReactNode;
  /** Lässt ein bereits gerendertes Puzzle unter der Nachher-Seite sichtbar. */
  transparentBackground?: boolean;
  className?: string;
  /** Zeigt zuerst volles Nachher-Bild, schiebt den Slider bis „Vorher“ lesbar ist. */
  introAnimation?: boolean;
  /** Pause vor der Einstiegsanimation; null wartet auf die Freigabe. */
  introHoldMs?: number | null;
  /** Die Pause erst starten, wenn Medien und Sheet bereit sind. */
  introPlaybackReady?: boolean;
  reducedMotion?: boolean;
  /** „Vorher“ / „Nachher“ oben, mit Slider-Maske. */
  compareLabels?: boolean;
  onBeforeImageLoaded?: () => void;
};

export function BeforeAfterSlider({
  beforeSrc,
  afterSrc = null,
  beforeAlt = "",
  afterAlt = "",
  afterContent = null,
  transparentBackground = false,
  className = "",
  introAnimation = false,
  introHoldMs: introHoldMsProp,
  introPlaybackReady = true,
  reducedMotion: reducedMotionProp,
  compareLabels = false,
  onBeforeImageLoaded,
}: Props) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const reducedMotion = reducedMotionProp ?? prefersReducedMotion;
  const runIntro = introAnimation && !reducedMotion;
  const containerRef = useRef<HTMLDivElement>(null);
  const beforeImgRef = useRef<HTMLImageElement>(null);
  const beforeLabelRef = useRef<HTMLSpanElement>(null);
  const draggingRef = useRef(false);
  const [position, setPosition] = useState(runIntro ? 0 : 0.5);
  const [introTransitioning, setIntroTransitioning] = useState(false);
  const [introComplete, setIntroComplete] = useState(!runIntro);
  const [handleLayout, setHandleLayout] = useState<{
    width: number;
    insets: BeforeAfterSliderClipInsets;
  }>({ width: 0, insets: { leftPx: 0, rightPx: 0 } });

  const resolveIntroEndPosition = useCallback(() => {
    const el = containerRef.current;
    if (!el) {
      return INTRO_END_VIEWPORT_FRACTION;
    }
    return introEndPositionForBeforeLabel(el, beforeLabelRef.current);
  }, []);

  const measureHandleLayout = useCallback(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    const rect = el.getBoundingClientRect();
    setHandleLayout({
      width: rect.width,
      insets: resolveBeforeAfterSliderClipInsets(el, rect),
    });
  }, []);

  const setFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) {
      return;
    }
    const ratio = (clientX - rect.left) / rect.width;
    setPosition(clampRevealRatio(ratio));
  }, []);

  useEffect(() => {
    if (!reducedMotion) {
      return;
    }
    setPosition(runIntro ? resolveIntroEndPosition() : 0.5);
    setIntroComplete(true);
    setIntroTransitioning(false);
  }, [reducedMotion, runIntro, resolveIntroEndPosition]);

  useEffect(() => {
    if (!runIntro) {
      return;
    }
    if (introHoldMsProp === null) {
      return;
    }
    if (!introPlaybackReady) {
      return;
    }
    const holdMs = introHoldMsProp ?? INTRO_HOLD_MS;
    let slideRaf = 0;
    let slideStartMs = 0;
    const holdTimer = window.setTimeout(() => {
      const endPosition = resolveIntroEndPosition();
      setIntroTransitioning(true);
      slideStartMs = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - slideStartMs) / INTRO_SLIDE_MS);
        setPosition(easeIntroSlide(progress) * endPosition);
        if (progress < 1) {
          slideRaf = requestAnimationFrame(tick);
          return;
        }
        setPosition(endPosition);
        setIntroTransitioning(false);
        setIntroComplete(true);
      };
      slideRaf = requestAnimationFrame(tick);
    }, holdMs);
    return () => {
      window.clearTimeout(holdTimer);
      cancelAnimationFrame(slideRaf);
    };
  }, [runIntro, introHoldMsProp, introPlaybackReady, resolveIntroEndPosition]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    measureHandleLayout();
    const observer = new ResizeObserver(measureHandleLayout);
    observer.observe(el);
    window.visualViewport?.addEventListener("resize", measureHandleLayout);
    window.visualViewport?.addEventListener("scroll", measureHandleLayout);
    return () => {
      observer.disconnect();
      window.visualViewport?.removeEventListener("resize", measureHandleLayout);
      window.visualViewport?.removeEventListener("scroll", measureHandleLayout);
    };
  }, [measureHandleLayout]);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (!draggingRef.current) {
        return;
      }
      setFromClientX(event.clientX);
    };
    const onUp = () => {
      draggingRef.current = false;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [setFromClientX]);

  useEffect(() => {
    if (!onBeforeImageLoaded || !beforeSrc) {
      return;
    }
    const img = beforeImgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      onBeforeImageLoaded();
    }
  }, [beforeSrc, onBeforeImageLoaded]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (reducedMotion || !introComplete) {
      return;
    }
    const step = event.shiftKey ? 0.1 : 0.04;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setPosition((p) => clampRevealRatio(p - step));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      setPosition((p) => clampRevealRatio(p + step));
    }
  };

  const revealPercent = position * 100;
  const handlePositionRatio =
    handleLayout.width > 0
      ? clampBeforeAfterSliderPosition(
          position,
          handleLayout.width,
          handleLayout.insets,
        )
      : position;
  const handlePercent = handlePositionRatio * 100;

  const beforeClipPath = `polygon(0 0, ${revealPercent}% 0, ${revealPercent}% 100%, 0 100%)`;
  const afterLabelClipPath = `polygon(${revealPercent}% 0, 100% 0, 100% 100%, ${revealPercent}% 100%)`;

  const compareLabelClass =
    "font-display text-base font-bold leading-[1.2] tracking-[0.02em] text-swg-white uppercase [text-shadow:0_1px_2px_rgb(0_0_0_/55%),0_0_12px_rgb(0_0_0_/35%)]";
  /** Beschriftungen beim animierten Einstieg einblenden; sonst sofort anzeigen. */
  const compareLabelsVisible = !runIntro || introTransitioning || introComplete;
  /** Den grünen Schieber erst nach der Einstiegsanimation zeigen. */
  const handleVisible = !runIntro || introComplete;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative touch-none select-none overflow-visible rounded-[0.35rem] gallery-ba",
        introTransitioning && "gallery-ba-intro",
        className,
      )}
      style={
        introTransitioning
          ? ({
              "--gallery-ba-intro-ms": `${INTRO_SLIDE_MS}ms`,
            } as React.CSSProperties)
          : undefined
      }
    >
      <div
        className={cn(
          "absolute inset-0 overflow-hidden rounded-[0.35rem]",
          transparentBackground ? "bg-transparent" : "bg-[#1a1a1a]",
        )}
      >
        <div className="absolute inset-0 z-0">
          {afterContent ??
            (afterSrc ? (
              <img
                src={afterSrc}
                alt={afterAlt}
                className="gallery-ba-img block size-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="size-full bg-[#444]" />
            ))}
          {compareLabels ? (
            <div
              className={cn(
                "gallery-ba-compare-labels gallery-ba-compare-labels-after pointer-events-none absolute inset-x-0 top-0 z-[2] box-border flex w-full max-w-full items-start justify-end px-[calc(1rem+10px)] pt-[var(--gallery-ba-label-pt,0.75rem)] opacity-0",
                compareLabelsVisible && "opacity-100",
              )}
              style={{ clipPath: afterLabelClipPath }}
              aria-hidden
            >
              <span className={compareLabelClass}>Schwammtastisch</span>
            </div>
          ) : null}
        </div>

        <div
          className="gallery-ba-layer-before absolute inset-0 z-[1]"
          style={{ clipPath: beforeClipPath }}
        >
          {beforeSrc ? (
            <img
              ref={beforeImgRef}
              src={beforeSrc}
              alt={beforeAlt}
              className="gallery-ba-img block size-full object-cover"
              draggable={false}
              onLoad={onBeforeImageLoaded}
            />
          ) : (
            <div className="size-full bg-[#444]" />
          )}
          {compareLabels ? (
            <div
              className={cn(
                "gallery-ba-compare-labels gallery-ba-compare-labels-before pointer-events-none absolute inset-x-0 top-0 z-[2] box-border flex w-full max-w-full items-start justify-start px-[calc(1rem+10px)] pt-[var(--gallery-ba-label-pt,0.75rem)] opacity-0",
                compareLabelsVisible && "opacity-100",
              )}
              aria-hidden
            >
              <span ref={beforeLabelRef} className={compareLabelClass}>
                Vorher
              </span>
            </div>
          ) : null}
        </div>

        <div
          className="gallery-ba-divider pointer-events-none absolute top-0 bottom-0 z-[2] w-[0.2rem] -translate-x-1/2 bg-swg-green-light shadow-[0_0_0_1px_rgb(0_0_0_/0.18)]"
          style={{ left: `${revealPercent}%` }}
          aria-hidden
        />
      </div>

      <button
        type="button"
        className={cn(
          "gallery-ba-handle absolute top-0 z-[3] flex h-full w-12 -translate-x-1/2 cursor-ew-resize touch-none items-center justify-center border-0 bg-transparent p-0 transition-opacity duration-300 motion-reduce:transition-none",
          !handleVisible && "pointer-events-none opacity-0",
        )}
        style={{ left: `${handlePercent}%` }}
        aria-label="Vorher-Nachher-Vergleich verschieben"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(revealPercent)}
        aria-hidden={!handleVisible}
        tabIndex={handleVisible ? 0 : -1}
        role="slider"
        onKeyDown={onKeyDown}
        onPointerDown={(event) => {
          if (reducedMotion || !introComplete) {
            return;
          }
          draggingRef.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          setFromClientX(event.clientX);
        }}
      >
        <span
          className="flex size-12 items-center justify-center gap-[0.3rem] rounded-full bg-swg-green-light text-swg-black shadow-[0_0_0_2px_rgb(0_0_0_/0.2)]"
          aria-hidden
        >
          <BeforeAfterHandleChevron className="block h-[1.65rem] w-[0.85rem] shrink-0" />
          <BeforeAfterHandleChevron className="block h-[1.65rem] w-[0.85rem] shrink-0 -scale-x-100" />
        </span>
      </button>
    </div>
  );
}
