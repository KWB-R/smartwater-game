import {
  useId,
  useLayoutEffect,
  useState,
  type CSSProperties,
} from "react";
import {
  clipLevelPlayTutorialRect,
  cappedTutorialHoleRadiusPx,
  levelPlayTutorialBorderRadiusPx,
} from "@/features/level/tutorial/levelPlayTutorialRect";
import type { LevelPlayTutorialRect } from "@/features/level/tutorial/types";
import {
  getAppViewportElement,
  measureAppViewportBox,
  type AppViewportBox,
} from "@/lib/appViewport";
import { cn } from "@/lib/cn";

type TutorialSpotlightProps = {
  highlightRect: LevelPlayTutorialRect | null;
  /** Weitere Ausschnitte ohne Abdunklung (ohne grünen Rahmen). */
  undimRects?: LevelPlayTutorialRect[];
  /** Zusätzliche grüne Rahmen (z. B. alle Puzzleteile). */
  secondaryHighlightRects?: LevelPlayTutorialRect[];
  /** Bibliotheksrahmen am sichtbaren Innenbereich der Ablage beschneiden. */
  highlightClipRect?: LevelPlayTutorialRect | null;
  secondaryHighlightPadding?: number;
  padding?: number;
  dimOpacity?: number;
  /** Die Abdunklung blockiert Klicks außerhalb der ausgesparten Bereiche. */
  blockPointerEvents?: boolean;
  /** Nur die Sprechblase bedienbar lassen; Hervorhebungen dienen der Orientierung. */
  blockPointerThroughHoles?: boolean;
  /** Grüner Rahmen um das primäre Highlight (Standard: an). */
  showPrimaryHighlightRing?: boolean;
  /** Grüner Rahmen pulsiert (z. B. Zieh-Schritt). */
  highlightPulse?: boolean;
  /** Lässt die zusätzlichen Bibliotheksrahmen pulsieren. */
  secondaryHighlightPulse?: boolean;
  /** Halbdunkles Overlay außerhalb der Highlights (Standard: aus). */
  showDimOverlay?: boolean;
  /** Das Hauptziel aus der Abdunklung aussparen. */
  dimPrimaryTarget?: boolean;
  highlightRingBorderRadius?: string;
};

function insetRect(
  rect: LevelPlayTutorialRect,
  padding: number,
): LevelPlayTutorialRect {
  return {
    top: rect.top - padding,
    left: rect.left - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
}

function clipHighlightHole(
  hole: LevelPlayTutorialRect | null,
  clip: LevelPlayTutorialRect | null | undefined,
): LevelPlayTutorialRect | null {
  if (!hole) {
    return null;
  }
  return clipLevelPlayTutorialRect(hole, clip ?? null);
}

/** Rechnet Bildschirmrechtecke in Koordinaten des App-Viewports um. */
function toAppViewportLocal(
  hole: LevelPlayTutorialRect,
  box: AppViewportBox,
): LevelPlayTutorialRect {
  return {
    left: hole.left - box.left,
    top: hole.top - box.top,
    width: hole.width,
    height: hole.height,
  };
}

function useAppViewportBox(): AppViewportBox {
  const [box, setBox] = useState<AppViewportBox>(() =>
    typeof document !== "undefined"
      ? measureAppViewportBox()
      : { left: 0, top: 0, width: 0, height: 0 },
  );

  useLayoutEffect(() => {
    const el = getAppViewportElement();
    const update = () => {
      setBox(measureAppViewportBox());
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, []);

  return box;
}

function appViewportLayerStyle(box: AppViewportBox): CSSProperties {
  return {
    top: box.top,
    left: box.left,
    width: box.width,
    height: box.height,
  };
}

function HighlightRing({
  hole,
  highlightPulse = false,
  borderRadius,
}: {
  hole: LevelPlayTutorialRect;
  highlightPulse?: boolean;
  borderRadius?: string;
}) {
  return (
    <div
      className={cn(
        "tutorial-spotlight-ring pointer-events-none fixed z-[1]",
        highlightPulse && "tutorial-spotlight-ring--pulse",
      )}
      style={{
        top: hole.top,
        left: hole.left,
        width: hole.width,
        height: hole.height,
        transformOrigin: "center center",
        ...(borderRadius != null ? { borderRadius } : {}),
      }}
      aria-hidden
    />
  );
}

/** Klicks nur durch ausgesparte Bereiche durchreichen. */
function MultiHolePointerBlocker({
  holes,
  box,
  holeBorderRadiusPx,
}: {
  holes: LevelPlayTutorialRect[];
  box: AppViewportBox;
  holeBorderRadiusPx: number;
}) {
  const maskId = useId().replace(/:/g, "");
  if (box.width <= 0 || box.height <= 0 || holes.length === 0) {
    return null;
  }

  const localHoles = holes.map((hole) => toAppViewportLocal(hole, box));

  return (
    <svg
      className="pointer-events-none fixed z-0"
      style={appViewportLayerStyle(box)}
      aria-hidden
      width={box.width}
      height={box.height}
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse">
          <rect
            x={0}
            y={0}
            width={box.width}
            height={box.height}
            fill="white"
          />
          {localHoles.map((hole, index) => {
            const rx = cappedTutorialHoleRadiusPx(hole, holeBorderRadiusPx);
            return (
              <rect
                key={index}
                x={hole.left}
                y={hole.top}
                width={hole.width}
                height={hole.height}
                rx={rx}
                ry={rx}
                fill="black"
              />
            );
          })}
        </mask>
      </defs>
      <rect
        x={0}
        y={0}
        width={box.width}
        height={box.height}
        fill="transparent"
        mask={`url(#${maskId})`}
        className="pointer-events-auto"
      />
    </svg>
  );
}

function AppViewportPointerBlocker({ box }: { box: AppViewportBox }) {
  return (
    <div
      className="pointer-events-auto fixed z-0"
      style={appViewportLayerStyle(box)}
      aria-hidden
    />
  );
}

/** Mehrere Löcher: SVG-Maske (nur Darstellung; Klicks nicht auf der Maske abfangen). */
function MultiHoleSpotlight({
  holes,
  box,
  dimOpacity,
  holeBorderRadiusPx,
}: {
  holes: LevelPlayTutorialRect[];
  box: AppViewportBox;
  dimOpacity: number;
  holeBorderRadiusPx: number;
}) {
  const maskId = useId().replace(/:/g, "");
  if (box.width <= 0 || box.height <= 0) {
    return null;
  }

  const localHoles = holes.map((hole) => toAppViewportLocal(hole, box));

  return (
    <svg
      className="pointer-events-none fixed z-0"
      style={appViewportLayerStyle(box)}
      aria-hidden
      width={box.width}
      height={box.height}
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse">
          <rect
            x={0}
            y={0}
            width={box.width}
            height={box.height}
            fill="white"
          />
          {localHoles.map((hole, index) => {
            const rx = cappedTutorialHoleRadiusPx(hole, holeBorderRadiusPx);
            return (
              <rect
                key={index}
                x={hole.left}
                y={hole.top}
                width={hole.width}
                height={hole.height}
                rx={rx}
                ry={rx}
                fill="black"
              />
            );
          })}
        </mask>
      </defs>
      <rect
        x={0}
        y={0}
        width={box.width}
        height={box.height}
        fill={`rgba(15, 23, 42, ${dimOpacity})`}
        mask={`url(#${maskId})`}
      />
    </svg>
  );
}

export function TutorialSpotlight({
  highlightRect,
  undimRects = [],
  secondaryHighlightRects = [],
  highlightClipRect = null,
  secondaryHighlightPadding = 6,
  padding = 6,
  dimOpacity = 0.45,
  blockPointerEvents = true,
  blockPointerThroughHoles = false,
  showPrimaryHighlightRing = true,
  highlightPulse = false,
  secondaryHighlightPulse = false,
  showDimOverlay = false,
  dimPrimaryTarget = true,
  highlightRingBorderRadius,
}: TutorialSpotlightProps) {
  const holeBorderRadiusPx = levelPlayTutorialBorderRadiusPx(
    highlightRingBorderRadius,
  );
  const box = useAppViewportBox();
  const appViewportClip: LevelPlayTutorialRect = {
    left: box.left,
    top: box.top,
    width: box.width,
    height: box.height,
  };

  const clip = highlightClipRect;
  const primaryRingHoleRaw =
    highlightRect != null && showPrimaryHighlightRing !== false
      ? insetRect(highlightRect, padding)
      : null;
  const primaryRingHole = primaryRingHoleRaw
    ? clipHighlightHole(
        clipHighlightHole(primaryRingHoleRaw, clip),
        appViewportClip,
      )
    : null;
  const primaryDimHoleRaw =
    highlightRect != null ? insetRect(highlightRect, padding) : null;
  const primaryDimHole = primaryDimHoleRaw
    ? clipHighlightHole(
        clipHighlightHole(primaryDimHoleRaw, clip),
        appViewportClip,
      )
    : null;
  const extraHoles = undimRects
    .map((r) => insetRect(r, 0))
    .map((hole) => clipHighlightHole(hole, appViewportClip))
    .filter((hole): hole is LevelPlayTutorialRect => hole != null);
  const secondaryHoles = secondaryHighlightRects
    .map((r) => insetRect(r, secondaryHighlightPadding))
    .map((hole) => clipHighlightHole(hole, clip))
    .map((hole) => (hole ? clipHighlightHole(hole, appViewportClip) : null))
    .filter((hole): hole is LevelPlayTutorialRect => hole != null);

  if (!showDimOverlay) {
    if (primaryRingHole == null && secondaryHoles.length === 0) {
      return null;
    }
    return (
      <>
        {primaryRingHole ? (
          <HighlightRing
            hole={primaryRingHole}
            highlightPulse={highlightPulse}
            borderRadius={highlightRingBorderRadius}
          />
        ) : null}
        {secondaryHoles.map((hole, index) => (
          <HighlightRing
            key={index}
            hole={hole}
            highlightPulse={secondaryHighlightPulse}
            borderRadius={highlightRingBorderRadius}
          />
        ))}
      </>
    );
  }

  const dimHoles = [
    ...(dimPrimaryTarget && primaryDimHole ? [primaryDimHole] : []),
    ...extraHoles,
    ...secondaryHoles,
  ];

  if (dimHoles.length === 0) {
    return (
      <div
        className={cn(
          "fixed z-0 bg-slate-900/45",
          blockPointerEvents ? "pointer-events-auto" : "pointer-events-none",
        )}
        style={{ ...appViewportLayerStyle(box), opacity: dimOpacity }}
        aria-hidden
      />
    );
  }

  const highlightRings = (
    <>
      {primaryRingHole ? (
        <HighlightRing
          hole={primaryRingHole}
          highlightPulse={highlightPulse}
          borderRadius={highlightRingBorderRadius}
        />
      ) : null}
      {secondaryHoles.map((hole, index) => (
        <HighlightRing
          key={index}
          hole={hole}
          highlightPulse={secondaryHighlightPulse}
          borderRadius={highlightRingBorderRadius}
        />
      ))}
    </>
  );

  const pointerBlocker =
    blockPointerEvents && blockPointerThroughHoles ? (
      <AppViewportPointerBlocker box={box} />
    ) : blockPointerEvents && dimHoles.length > 0 ? (
      <MultiHolePointerBlocker
        holes={dimHoles}
        box={box}
        holeBorderRadiusPx={holeBorderRadiusPx}
      />
    ) : null;

  const dimVisual = (
    <MultiHoleSpotlight
      holes={dimHoles}
      box={box}
      dimOpacity={dimOpacity}
      holeBorderRadiusPx={holeBorderRadiusPx}
    />
  );

  return (
    <>
      {dimVisual}
      {pointerBlocker}
      {highlightRings}
    </>
  );
}
