import { memo, useLayoutEffect, useRef } from "react";
import type { RefObject, PointerEventHandler } from "react";
import { createBoardApp } from "./pixi/createBoardApp";
import { BoardScene } from "./pixi/BoardScene";

function resolveVideoOverlayHost(
  canvasHost: HTMLElement,
  videoOverlayHostRef: RefObject<HTMLDivElement | null>,
): HTMLElement {
  return (
    videoOverlayHostRef.current ??
    canvasHost.closest(".level-design-frame") ??
    canvasHost.parentElement ??
    canvasHost
  );
}

type BoardPixiLayerProps = {
  canvasHostRef: RefObject<HTMLDivElement | null>;
  /** `.level-design-frame` — transparente Placement-Videos als DOM-Overlay. */
  videoOverlayHostRef?: RefObject<HTMLDivElement | null>;
  backgroundUrl: string;
  coordinateReference?: { width: number; height: number };
  onSceneReady: (scene: BoardScene | null) => void;
  onPointerDown?: PointerEventHandler<HTMLDivElement>;
  role?: string;
  "aria-label"?: string;
};

function BoardPixiLayerInner({
  canvasHostRef,
  videoOverlayHostRef,
  backgroundUrl,
  coordinateReference,
  onSceneReady,
  onPointerDown,
  role,
  "aria-label": ariaLabel,
}: BoardPixiLayerProps) {
  const initGenerationRef = useRef(0);

  useLayoutEffect(() => {
    let cancelled = false;
    let scene: BoardScene | null = null;
    let destroyPixi: (() => void) | null = null;
    const generation = ++initGenerationRef.current;

    let initStarted = false;

    const runInit = () => {
      if (cancelled || generation !== initGenerationRef.current || initStarted) {
        return;
      }

      const host = canvasHostRef.current;
      if (!host) return;

      initStarted = true;
      const videoHost = resolveVideoOverlayHost(
        host,
        videoOverlayHostRef ?? { current: null },
      );

      const bgUrl = backgroundUrl?.trim() ?? "";
      if (!bgUrl) {
        onSceneReady(null);
        return;
      }

      void (async () => {
        try {
          const created = await createBoardApp(host);
          destroyPixi = created.destroy;
          if (cancelled || generation !== initGenerationRef.current) {
            created.destroy();
            return;
          }
          scene = new BoardScene(created.app, created.world, host, videoHost);
          onSceneReady(scene);
          if (cancelled || generation !== initGenerationRef.current) {
            scene.destroy();
            created.destroy();
            return;
          }
          await scene.ensureBackground(bgUrl, coordinateReference);
        } catch {
          onSceneReady(null);
        }
      })();
    };

    runInit();
    const retryId = requestAnimationFrame(() => {
      runInit();
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(retryId);
      scene?.destroy();
      onSceneReady(null);
      destroyPixi?.();
    };
  }, [
    backgroundUrl,
    coordinateReference,
    onSceneReady,
    canvasHostRef,
    videoOverlayHostRef,
  ]);

  return (
    <div
      ref={canvasHostRef}
      className="level-pixi-root level-pixi-root--in-design-frame"
      onPointerDown={onPointerDown}
      role={role}
      aria-label={ariaLabel}
    />
  );
}

export const BoardPixiLayer = memo(
  BoardPixiLayerInner,
  (a, b) =>
    a.backgroundUrl === b.backgroundUrl &&
    a.coordinateReference?.width === b.coordinateReference?.width &&
    a.coordinateReference?.height === b.coordinateReference?.height &&
    a.onSceneReady === b.onSceneReady &&
    a.canvasHostRef === b.canvasHostRef &&
    a.videoOverlayHostRef === b.videoOverlayHostRef &&
    a.onPointerDown === b.onPointerDown &&
    a.role === b.role &&
    a["aria-label"] === b["aria-label"],
);