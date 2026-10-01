import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  BERLIN_MAP_VIEWBOX,
  MAP_OVERVIEW_VIEWBOX_WIDTH,
} from "./berlinMapConstants";
import { DISTRICT_MAP_FOCUS_ANIMATION_MS } from "./mapDetailTiming";

export type MapViewBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function createOverviewMapViewBox(): MapViewBox {
  const width = MAP_OVERVIEW_VIEWBOX_WIDTH;
  const height = (width / BERLIN_MAP_VIEWBOX.width) * BERLIN_MAP_VIEWBOX.height;
  return {
    x: (BERLIN_MAP_VIEWBOX.width - width) / 2,
    y: (BERLIN_MAP_VIEWBOX.height - height) / 2,
    width,
    height,
  };
}

export const INITIAL_MAP_VIEW_BOX: MapViewBox = createOverviewMapViewBox();

const ZOOM_FACTOR = 1.08;
const MIN_VB_WIDTH = BERLIN_MAP_VIEWBOX.width / 7;
/** Maximales Herauszoomen = Start-Übersicht (nicht weiter raus als Initial). */
const MAX_VB_WIDTH = MAP_OVERVIEW_VIEWBOX_WIDTH;
const VIEWBOX_WIDTH_EPSILON = 0.01;
/** Zusätzlicher Verschiebebereich über den Kartenrand hinaus, relativ zur aktuellen viewBox. */
const VIEWBOX_PAN_OVERSHOOT_RATIO = 0.55;
const DEFAULT_BBOX_FOCUS_PAD_RATIO = 0.45;
const REACT_VIEWBOX_COMMIT_INTERVAL_MS = 33;
const WHEEL_VIEWBOX_COMMIT_DELAY_MS = 120;
/** Näherer Ausgangszoom auf den Bezirk bei geöffnetem Detail-Sheet. */
export const MAP_DETAIL_BBOX_FOCUS_PAD_RATIO = 0.28;
const PAN_CLICK_THRESHOLD_PX = 6;
/** Dauer beim Zoomen auf einen gewählten Bezirk */
const DISTRICT_FOCUS_ANIMATION_MS = DISTRICT_MAP_FOCUS_ANIMATION_MS;

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function viewBoxesNear(a: MapViewBox, b: MapViewBox, epsilon = 1.25): boolean {
  return (
    Math.abs(a.x - b.x) < epsilon &&
    Math.abs(a.y - b.y) < epsilon &&
    Math.abs(a.width - b.width) < epsilon &&
    Math.abs(a.height - b.height) < epsilon
  );
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

type PointerCapture = {
  pointerId: number;
  startX: number;
  startY: number;
  origin: MapViewBox;
};

function clampViewBox(next: MapViewBox): MapViewBox {
  const width = Math.min(MAX_VB_WIDTH, Math.max(MIN_VB_WIDTH, next.width));
  const height = (width / BERLIN_MAP_VIEWBOX.width) * BERLIN_MAP_VIEWBOX.height;
  const overshootX = width * VIEWBOX_PAN_OVERSHOOT_RATIO;
  const overshootY = height * VIEWBOX_PAN_OVERSHOOT_RATIO;
  const minX =
    Math.min(0, BERLIN_MAP_VIEWBOX.width - width) - overshootX;
  const maxX =
    Math.max(0, BERLIN_MAP_VIEWBOX.width - width) + overshootX;
  const minY =
    Math.min(0, BERLIN_MAP_VIEWBOX.height - height) - overshootY;
  const maxY =
    Math.max(0, BERLIN_MAP_VIEWBOX.height - height) + overshootY;
  const x = Math.min(maxX, Math.max(minX, next.x));
  const y = Math.min(maxY, Math.max(minY, next.y));
  return { x, y, width, height };
}

export function zoomViewBoxAtPoint(
  prev: MapViewBox,
  rect: DOMRect,
  clientX: number,
  clientY: number,
  widthScale: number,
): MapViewBox {
  const zoomingOut = widthScale > 1;
  const zoomingIn = widthScale < 1;
  if (zoomingOut && prev.width >= MAX_VB_WIDTH - VIEWBOX_WIDTH_EPSILON) {
    return prev;
  }
  if (zoomingIn && prev.width <= MIN_VB_WIDTH + VIEWBOX_WIDTH_EPSILON) {
    return prev;
  }

  const cursorX = clientX - rect.left;
  const cursorY = clientY - rect.top;
  const nextWidth = Math.min(
    MAX_VB_WIDTH,
    Math.max(MIN_VB_WIDTH, prev.width * widthScale),
  );
  const nextHeight =
    (nextWidth / BERLIN_MAP_VIEWBOX.width) * BERLIN_MAP_VIEWBOX.height;
  const svgX = prev.x + (cursorX / rect.width) * prev.width;
  const svgY = prev.y + (cursorY / rect.height) * prev.height;
  const nextX = svgX - (cursorX / rect.width) * nextWidth;
  const nextY = svgY - (cursorY / rect.height) * nextHeight;
  const clamped = clampViewBox({
    x: nextX,
    y: nextY,
    width: nextWidth,
    height: nextHeight,
  });
  if (
    Math.abs(clamped.width - prev.width) < VIEWBOX_WIDTH_EPSILON &&
    Math.abs(clamped.height - prev.height) < VIEWBOX_WIDTH_EPSILON
  ) {
    return prev;
  }
  return clamped;
}

type ClientPoint = { clientX: number; clientY: number };

type PinchGesture = {
  startDistance: number;
  origin: MapViewBox;
  centerX: number;
  centerY: number;
};

function pinchDistance(a: ClientPoint, b: ClientPoint): number {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function pinchCenter(a: ClientPoint, b: ClientPoint): ClientPoint {
  return {
    clientX: (a.clientX + b.clientX) / 2,
    clientY: (a.clientY + b.clientY) / 2,
  };
}

export function viewBoxToAttribute(viewBox: MapViewBox): string {
  return `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`;
}

type ViewBoxBBoxFocusOptions = {
  padRatio?: number;
};

export function viewBoxForSvgBBox(
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  },
  options?: ViewBoxBBoxFocusOptions,
): MapViewBox {
  const cx = bbox.x + bbox.width / 2;
  const cy = bbox.y + bbox.height / 2;
  const padRatio = options?.padRatio ?? DEFAULT_BBOX_FOCUS_PAD_RATIO;
  const pad = Math.max(bbox.width, bbox.height) * padRatio;
  const width = bbox.width + pad * 2;
  const height = bbox.height + pad * 2;
  return clampViewBox({
    x: cx - width / 2,
    y: cy - height / 2,
    width,
    height,
  });
}

function meetUniformScale(
  viewBox: Pick<MapViewBox, "width" | "height">,
  canvasSize: { width: number; height: number },
): number {
  return Math.min(
    canvasSize.width / viewBox.width,
    canvasSize.height / viewBox.height,
  );
}

/** Bildschirmhöhe einer SVG-Y-Koordinate bei xMidYMid meet, gemessen ab der oberen Canvas-Kante. */
export function screenYForSvgPointY(
  svgY: number,
  viewBox: MapViewBox,
  canvasSize: { width: number; height: number },
): number {
  const scale = meetUniformScale(viewBox, canvasSize);
  const offsetY = (canvasSize.height - viewBox.height * scale) / 2;
  return offsetY + (svgY - viewBox.y) * scale;
}

function viewBoxYAligningPointAtScreenY(
  svgY: number,
  viewBox: MapViewBox,
  canvasSize: { width: number; height: number },
  targetScreenY: number,
): number {
  const scale = meetUniformScale(viewBox, canvasSize);
  const offsetY = (canvasSize.height - viewBox.height * scale) / 2;
  return svgY - (targetScreenY - offsetY) / scale;
}

/** Positioniert die Mitte des Bezirksrechtecks auf targetCenterLocalY bei xMidYMid meet. */
export function viewBoxForSvgBBoxAtCanvasY(
  bbox: { x: number; y: number; width: number; height: number },
  canvasSize: { width: number; height: number },
  targetCenterLocalY: number,
  options?: ViewBoxBBoxFocusOptions,
): MapViewBox {
  if (
    canvasSize.width <= 0 ||
    canvasSize.height <= 0 ||
    !Number.isFinite(targetCenterLocalY)
  ) {
    return viewBoxForSvgBBox(bbox, options);
  }

  const cx = bbox.x + bbox.width / 2;
  const cy = bbox.y + bbox.height / 2;
  const padRatio = options?.padRatio ?? DEFAULT_BBOX_FOCUS_PAD_RATIO;
  const pad = Math.max(bbox.width, bbox.height) * padRatio;
  const desiredWidth = bbox.width + pad * 2;
  const desiredHeight = bbox.height + pad * 2;

  let viewBox = clampViewBox({
    x: cx - desiredWidth / 2,
    y: cy - desiredHeight / 2,
    width: desiredWidth,
    height: desiredHeight,
  });

  viewBox = clampViewBox({
    ...viewBox,
    x: cx - viewBox.width / 2,
  });

  const alignedY = viewBoxYAligningPointAtScreenY(
    cy,
    viewBox,
    canvasSize,
    targetCenterLocalY,
  );

  return clampViewBox({
    ...viewBox,
    y: alignedY,
  });
}

export type MapDistrictFocusAlign = {
  targetCenterLocalY: number;
};

export function mapDetailDistrictFocusAlign(
  canvasRect: DOMRect,
  sheetTopClientY: number,
): MapDistrictFocusAlign {
  const bandBottomLocal = Math.min(
    canvasRect.height,
    Math.max(0, sheetTopClientY - canvasRect.top),
  );
  const topInsetPx = Math.min(16, bandBottomLocal * 0.06);
  const bottomInsetPx = Math.min(12, bandBottomLocal * 0.05);
  const targetCenterLocalY =
    topInsetPx +
    (bandBottomLocal - topInsetPx - bottomInsetPx) / 2;
  return { targetCenterLocalY };
}

export function useBerlinMapViewBox(
  canvasRef: RefObject<HTMLDivElement | null>,
  options?: { initialViewBox?: MapViewBox },
) {
  const initialViewBoxRef = useRef(
    options?.initialViewBox ?? INITIAL_MAP_VIEW_BOX,
  );
  const [viewBox, setViewBox] = useState<MapViewBox>(
    initialViewBoxRef.current,
  );
  const liveViewBoxRef = useRef(initialViewBoxRef.current);
  const dragRef = useRef<PointerCapture | null>(null);
  const dragMovedRef = useRef(false);
  const activePointersRef = useRef(new Map<number, ClientPoint>());
  const pinchRef = useRef<PinchGesture | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const reactCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const wheelCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const pendingReactViewBoxRef = useRef<MapViewBox | null>(null);
  const viewBoxAttributeSyncRef = useRef<((attribute: string) => void) | null>(
    null,
  );
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const cancelViewBoxAnimation = useCallback(() => {
    if (animationFrameRef.current != null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (reactCommitTimerRef.current != null) {
      clearTimeout(reactCommitTimerRef.current);
      reactCommitTimerRef.current = null;
      pendingReactViewBoxRef.current = null;
    }
  }, []);

  const setInteractionActive = useCallback((active: boolean) => {
    if (active) {
      viewportRef.current?.setAttribute("data-map-interacting", "");
    } else {
      viewportRef.current?.removeAttribute("data-map-interacting");
    }
  }, []);

  const cancelWheelCommit = useCallback(() => {
    if (wheelCommitTimerRef.current != null) {
      clearTimeout(wheelCommitTimerRef.current);
      wheelCommitTimerRef.current = null;
    }
  }, []);

  const syncLiveViewBox = useCallback((next: MapViewBox) => {
    liveViewBoxRef.current = next;
    viewBoxAttributeSyncRef.current?.(viewBoxToAttribute(next));
  }, []);

  const scheduleReactViewBoxCommit = useCallback((next: MapViewBox) => {
    syncLiveViewBox(next);
    pendingReactViewBoxRef.current = next;
    if (reactCommitTimerRef.current != null) {
      return;
    }
    reactCommitTimerRef.current = setTimeout(() => {
      reactCommitTimerRef.current = null;
      const pending = pendingReactViewBoxRef.current;
      pendingReactViewBoxRef.current = null;
      if (pending) {
        setViewBox(pending);
      }
    }, REACT_VIEWBOX_COMMIT_INTERVAL_MS);
  }, [syncLiveViewBox]);

  const commitReactViewBox = useCallback(
    (next: MapViewBox) => {
      if (reactCommitTimerRef.current != null) {
        clearTimeout(reactCommitTimerRef.current);
        reactCommitTimerRef.current = null;
      }
      pendingReactViewBoxRef.current = null;
      syncLiveViewBox(next);
      setViewBox(next);
    },
    [syncLiveViewBox],
  );

  useEffect(
    () => () => {
      cancelViewBoxAnimation();
      cancelWheelCommit();
    },
    [cancelViewBoxAnimation, cancelWheelCommit],
  );

  const animateViewBoxTo = useCallback(
    (
      target: MapViewBox,
      durationMs: number,
      ease: (t: number) => number = easeOutCubic,
    ) => {
      cancelViewBoxAnimation();
      const goal = clampViewBox(target);
      if (reducedMotion || durationMs <= 0) {
        commitReactViewBox(goal);
        return;
      }

      const start = liveViewBoxRef.current;
      if (viewBoxesNear(start, goal)) {
        commitReactViewBox(goal);
        return;
      }
      const startTime = performance.now();

      const tick = (now: number) => {
        const raw = Math.min(1, (now - startTime) / durationMs);
        const t = ease(raw);
        const next = {
          x: lerp(start.x, goal.x, t),
          y: lerp(start.y, goal.y, t),
          width: lerp(start.width, goal.width, t),
          height: lerp(start.height, goal.height, t),
        };
        scheduleReactViewBoxCommit(next);
        if (raw < 1) {
          animationFrameRef.current = requestAnimationFrame(tick);
        } else {
          animationFrameRef.current = null;
          commitReactViewBox(goal);
        }
      };

      animationFrameRef.current = requestAnimationFrame(tick);
    },
    [
      cancelViewBoxAnimation,
      commitReactViewBox,
      reducedMotion,
      scheduleReactViewBoxCommit,
    ],
  );

  const applyViewBoxImmediate = useCallback(
    (target: MapViewBox) => {
      cancelViewBoxAnimation();
      commitReactViewBox(clampViewBox(target));
    },
    [cancelViewBoxAnimation, commitReactViewBox],
  );

  const getCanvasRect = useCallback(() => {
    return (
      canvasRef.current?.getBoundingClientRect() ??
      viewportRef.current?.getBoundingClientRect()
    );
  }, [canvasRef]);

  const beginPinchIfNeeded = useCallback(() => {
    const pointers = [...activePointersRef.current.values()];
    if (pointers.length !== 2) {
      pinchRef.current = null;
      return;
    }
    const center = pinchCenter(pointers[0], pointers[1]);
    const distance = pinchDistance(pointers[0], pointers[1]);
    if (distance < 8) {
      return;
    }
    dragRef.current = null;
    pinchRef.current = {
      startDistance: distance,
      origin: liveViewBoxRef.current,
      centerX: center.clientX,
      centerY: center.clientY,
    };
    dragMovedRef.current = true;
  }, []);

  const onPointerDownCapture = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 && event.pointerType === "mouse") {
        return;
      }
      const target = event.target as Element;
      if (!target.closest("[data-berlin-map-marker]")) {
        return;
      }

      activePointersRef.current.set(event.pointerId, {
        clientX: event.clientX,
        clientY: event.clientY,
      });
      if (activePointersRef.current.size < 2) {
        return;
      }

      cancelWheelCommit();
      cancelViewBoxAnimation();
      setInteractionActive(true);
      beginPinchIfNeeded();
      for (const pointerId of activePointersRef.current.keys()) {
        if (!event.currentTarget.hasPointerCapture(pointerId)) {
          event.currentTarget.setPointerCapture(pointerId);
        }
      }
    },
    [
      beginPinchIfNeeded,
      cancelViewBoxAnimation,
      cancelWheelCommit,
      setInteractionActive,
    ],
  );

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 && event.pointerType === "mouse") {
        return;
      }
      const target = event.target as HTMLElement;
      if (target.closest("a, button, [data-berlin-map-marker]")) {
        return;
      }

      cancelWheelCommit();
      setInteractionActive(true);
      activePointersRef.current.set(event.pointerId, {
        clientX: event.clientX,
        clientY: event.clientY,
      });

      if (activePointersRef.current.size >= 2) {
        cancelViewBoxAnimation();
        beginPinchIfNeeded();
        for (const pointerId of activePointersRef.current.keys()) {
          if (!event.currentTarget.hasPointerCapture(pointerId)) {
            event.currentTarget.setPointerCapture(pointerId);
          }
        }
        return;
      }

      cancelViewBoxAnimation();
      dragMovedRef.current = false;
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        origin: liveViewBoxRef.current,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [
      beginPinchIfNeeded,
      cancelViewBoxAnimation,
      cancelWheelCommit,
      setInteractionActive,
    ],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (activePointersRef.current.has(event.pointerId)) {
        activePointersRef.current.set(event.pointerId, {
          clientX: event.clientX,
          clientY: event.clientY,
        });
      }

      const pinch = pinchRef.current;
      if (pinch && activePointersRef.current.size >= 2) {
        const pointers = [...activePointersRef.current.values()];
        if (pointers.length >= 2) {
          const rect = getCanvasRect();
          if (rect && rect.width > 0 && rect.height > 0) {
            const distance = pinchDistance(pointers[0], pointers[1]);
            if (distance > 0 && pinch.startDistance > 0) {
              const widthScale = pinch.startDistance / distance;
              syncLiveViewBox(
                zoomViewBoxAtPoint(
                  pinch.origin,
                  rect,
                  pinch.centerX,
                  pinch.centerY,
                  widthScale,
                ),
              );
            }
          }
        }
        return;
      }

      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) {
        return;
      }
      const rect = getCanvasRect();
      if (!rect || rect.width <= 0 || rect.height <= 0) {
        return;
      }
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (Math.hypot(dx, dy) > PAN_CLICK_THRESHOLD_PX) {
        dragMovedRef.current = true;
      }
      const dvbX = (dx / rect.width) * drag.origin.width;
      const dvbY = (dy / rect.height) * drag.origin.height;
      syncLiveViewBox(
        clampViewBox({
          ...drag.origin,
          x: drag.origin.x - dvbX,
          y: drag.origin.y - dvbY,
        }),
      );
    },
    [getCanvasRect, syncLiveViewBox],
  );

  const endDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      activePointersRef.current.delete(event.pointerId);
      if (activePointersRef.current.size < 2) {
        pinchRef.current = null;
        setInteractionActive(false);
        commitReactViewBox(liveViewBoxRef.current);
      } else if (activePointersRef.current.size === 2) {
        beginPinchIfNeeded();
      }

      const drag = dragRef.current;
      if (drag && drag.pointerId === event.pointerId) {
        dragRef.current = null;
      }
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [beginPinchIfNeeded, commitReactViewBox, setInteractionActive],
  );

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) {
      return;
    }
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      cancelViewBoxAnimation();
      cancelWheelCommit();
      const rect = getCanvasRect();
      if (!rect || rect.width <= 0 || rect.height <= 0) {
        setInteractionActive(false);
        return;
      }
      const zoomIn = event.deltaY < 0;
      const factor = zoomIn ? 1 / ZOOM_FACTOR : ZOOM_FACTOR;
      setInteractionActive(true);
      syncLiveViewBox(
        zoomViewBoxAtPoint(
          liveViewBoxRef.current,
          rect,
          event.clientX,
          event.clientY,
          factor,
        ),
      );
      wheelCommitTimerRef.current = setTimeout(() => {
        wheelCommitTimerRef.current = null;
        setInteractionActive(false);
        commitReactViewBox(liveViewBoxRef.current);
      }, WHEEL_VIEWBOX_COMMIT_DELAY_MS);
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      cancelWheelCommit();
      el.removeEventListener("wheel", handleWheel);
    };
  }, [
    cancelViewBoxAnimation,
    cancelWheelCommit,
    commitReactViewBox,
    getCanvasRect,
    setInteractionActive,
    syncLiveViewBox,
  ]);

  const resetView = useCallback(() => {
    animateViewBoxTo(INITIAL_MAP_VIEW_BOX, DISTRICT_FOCUS_ANIMATION_MS);
  }, [animateViewBoxTo]);

  const focusOnSvgBBox = useCallback(
    (
      bbox: { x: number; y: number; width: number; height: number },
      align?: MapDistrictFocusAlign,
    ) => {
      const rect = getCanvasRect();
      const target =
        align && rect && rect.width > 0 && rect.height > 0
          ? viewBoxForSvgBBoxAtCanvasY(bbox, rect, align.targetCenterLocalY, {
              padRatio: MAP_DETAIL_BBOX_FOCUS_PAD_RATIO,
            })
          : viewBoxForSvgBBox(bbox);
      const goal = target;
      if (viewBoxesNear(liveViewBoxRef.current, goal)) {
        return;
      }
      animateViewBoxTo(goal, DISTRICT_FOCUS_ANIMATION_MS);
    },
    [animateViewBoxTo, getCanvasRect],
  );

  const setViewBoxAttributeSync = useCallback(
    (sync: ((attribute: string) => void) | null) => {
      viewBoxAttributeSyncRef.current = sync;
    },
    [],
  );

  return {
    viewportRef,
    dragMovedRef,
    viewBox,
    viewBoxAttribute: viewBoxToAttribute(viewBox),
    onPointerDownCapture,
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    resetView,
    focusOnSvgBBox,
    applyViewBoxImmediate,
    setViewBoxAttributeSync,
  };
}
