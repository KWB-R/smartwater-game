import { loopDurationMs } from "@/features/level/utils/spritesheetTiming";
import { Application, Container, Graphics, Sprite, Ticker } from "pixi.js";
import type { PlacedTile } from "@/features/level/logic/levelState";
import type { Tile } from "@/features/level/types";
import { getLevelAssetUrl } from "@/features/level/services/levelAssetUrls";
import { DESIGN_H, DESIGN_W, getDesignViewRect } from "@/components/features/level/scene/bridge/designViewRect";
import { uniformConfigToDesignScale } from "@/features/level/utils/configSpace";
import { clientToRefSpace } from "@/components/features/level/scene/bridge/pointerToRefSpace";
import {
  attachPlacedTransparentVideo,
  primePlacementVideosForTile,
  setPlacementVideoPlaybackSuspended,
  syncPlacementVideoOverlayOrder,
  teardownPlacementVideoOverlay,
  warmPlacementVideosForTiles,
} from "./placementVideo";
import {
  bindPlacementVideoPoolHost,
  teardownPlacementVideoPool,
} from "./placementVideoPool";
import {
  armBoardDragLiftFromPointer,
  BOARD_DRAG_LIFT_OFFSET_Y_PX,
  clearBoardDragPreview,
  showBoardDragPreviewForTile,
  teardownBoardDragOverlay,
  updateBoardDragPreview,
} from "./boardDragOverlay";
import {
  clearTileTextureCache,
  isSheet,
  loadTextureFromUrl,
  spritesheetTextures,
} from "./tileTextures";
import {
  pauseBoardAppRendering,
  resumeBoardAppRendering,
} from "./createBoardApp";

export class BoardScene {
  private readonly placedLayer = new Container();

  private dragTile: Tile | null = null;

  private readonly placedTickerStops: (() => void)[] = [];

  private placedRebuildGeneration = 0;

  private backgroundLoaded = false;

  private boardMask: Graphics | null = null;

  private appRenderingPaused = false;

  private destroyed = false;

  constructor(
    private readonly app: Application,
    private readonly world: Container,
    private host: HTMLElement,
    /** `.level-design-frame` — DOM-`<video>` für Alpha, nicht im WebGL-Canvas. */
    private videoOverlayHost: HTMLElement,
  ) {
    this.world.sortableChildren = true;
    this.world.addChild(this.placedLayer);
    this.placedLayer.zIndex = 1;
    bindPlacementVideoPoolHost(this.videoOverlayHost);
  }

  getCanvas(): HTMLCanvasElement {
    return this.app.canvas as HTMLCanvasElement;
  }

  /** Share-Combo-MP4: Pixi-Ticker und Brett-Videos stoppen, damit HTML5-Video flüssig läuft. */
  setAppRenderingPaused(paused: boolean): void {
    if (this.destroyed) {
      return;
    }
    if (this.appRenderingPaused === paused) {
      return;
    }
    this.appRenderingPaused = paused;
    if (paused) {
      setPlacementVideoPlaybackSuspended(true);
      pauseBoardAppRendering(this.app);
      for (const el of this.videoOverlayHost.querySelectorAll("video")) {
        el.pause();
      }
      return;
    }
    setPlacementVideoPlaybackSuspended(false);
    resumeBoardAppRendering(this.app, this.host);
    for (const el of this.videoOverlayHost.querySelectorAll("video")) {
      void el.play().catch(() => {});
    }
  }

  warmPlacementPreloads(tiles: Iterable<Tile>): void {
    warmPlacementVideosForTiles(tiles);
  }

  async ensureBackground(
    url: string,
    coordinateReference?: { width: number; height: number },
  ): Promise<void> {
    if (this.backgroundLoaded) return;
    if (url == null || String(url).trim() === "") {
      return;
    }
    const tex = await loadTextureFromUrl(getLevelAssetUrl(url));
    const bg = new Sprite(tex);
    const refW = Math.max(1, coordinateReference?.width ?? tex.width);
    const refH = Math.max(1, coordinateReference?.height ?? tex.height);
    const ref = { width: refW, height: refH };
    const s = uniformConfigToDesignScale(ref);
    bg.anchor.set(0, 0);
    bg.position.set(0, 0);
    /** Skaliert den Konfigurationsrahmen refW × refH auf beiden Achsen mit demselben Faktor. */
    bg.scale.set((s * refW) / tex.width, (s * refH) / tex.height);
    bg.zIndex = 0;

    const maskG = new Graphics();
    maskG.rect(0, 0, DESIGN_W, DESIGN_H).fill({ color: 0xffffff });
    maskG.eventMode = "none";
    maskG.zIndex = 0.5;
    this.boardMask = maskG;

    this.world.addChildAt(bg, 0);
    this.world.addChild(maskG);
    bg.mask = maskG;
    this.backgroundLoaded = true;
  }

  clearPlacedTickers(): void {
    for (const stop of this.placedTickerStops) stop();
    this.placedTickerStops.length = 0;
  }

  async rebuildPlaced(
    placedTiles: PlacedTile[],
    reducedMotion: boolean,
    options?: { skipPlacementIntro?: boolean },
  ): Promise<void> {
    const includesEndAnimation = placedTiles.some(
      (p) => p.placementKey === "end-animation",
    );
    if (
      options?.skipPlacementIntro &&
      placedTiles.length > 0 &&
      !includesEndAnimation
    ) {
      const existing = this.placedLayer.children;
      if (
        existing.length === placedTiles.length &&
        placedTiles.every((p, i) => existing[i]?.label === p.placementKey)
      ) {
        return;
      }
    }

    const generation = ++this.placedRebuildGeneration;
    const nextStops: (() => void)[] = [];
    const reusedStops = new Set<() => void>();
    const registerStop = (fn: () => void) => {
      nextStops.push(fn);
    };

    const prevStopsByKey = new Map<string, () => void>();
    for (let i = 0; i < this.placedLayer.children.length; i++) {
      const child = this.placedLayer.children[i];
      const key = child?.label;
      const stop = this.placedTickerStops[i];
      if (key && stop) {
        prevStopsByKey.set(key, stop);
      }
    }

    const tryReusePlacedBox = (placed: PlacedTile): Container | null => {
      if (!placed.skipPlacementVideoIntro && !options?.skipPlacementIntro) {
        return null;
      }
      const key = placed.placementKey;
      if (!prevStopsByKey.has(key)) {
        return null;
      }
      const existing = this.placedLayer.children.find((c) => c.label === key);
      if (!(existing instanceof Container)) {
        return null;
      }
      existing.position.set(placed.position.x, placed.position.y);
      const stop = prevStopsByKey.get(key);
      if (stop) {
        nextStops.push(stop);
        reusedStops.add(stop);
      }
      return existing;
    };

    const buildInParallel = true;

    const buildOne = async ({
      placementKey,
      tile,
      position,
      skipPlacementVideoIntro,
    }: PlacedTile): Promise<Container | null> => {
      if (generation !== this.placedRebuildGeneration) {
        return null;
      }
      const box = new Container();
      box.position.set(position.x, position.y);
      box.label = placementKey;

      const videoAttachOptions =
        skipPlacementVideoIntro || options?.skipPlacementIntro
          ? { skipIntro: true as const }
          : undefined;

      try {
        const pv = tile.placementVideo;
        if (pv && !reducedMotion) {
          const ok = await attachPlacedTransparentVideo(
            box,
            tile,
            this.app,
            registerStop,
            this.videoOverlayHost,
            videoAttachOptions,
            placementKey,
          );
          if (generation !== this.placedRebuildGeneration) {
            return null;
          }
          if (!ok) {
            const tex = await loadTextureFromUrl(getLevelAssetUrl(pv.preview.url));
            const sp = new Sprite(tex);
            this.fitSpriteInTile(sp, tile);
            box.addChild(sp);
          }
        } else if (pv && reducedMotion) {
          const tex = await loadTextureFromUrl(getLevelAssetUrl(pv.preview.url));
          const sp = new Sprite(tex);
          this.fitSpriteInTile(sp, tile);
          box.addChild(sp);
        } else if (isSheet(tile.image)) {
          const base = await loadTextureFromUrl(getLevelAssetUrl(tile.image.url));
          const frames = spritesheetTextures(tile.image, base);
          const loopMs = loopDurationMs(tile.image);

          if (reducedMotion || frames.length === 0) {
            const sp = new Sprite(frames[frames.length - 1] ?? frames[0]);
            this.fitSpriteInTile(sp, tile);
            box.addChild(sp);
          } else if (frames.length === 1) {
            const sp = new Sprite(frames[0]);
            this.fitSpriteInTile(sp, tile);
            box.addChild(sp);
          } else {
            const sp = new Sprite(frames[0]);
            this.fitSpriteInTile(sp, tile);
            box.addChild(sp);
            let elapsed = 0;
            const onTick = (t: Ticker) => {
              elapsed += t.deltaMS;
              const fi = Math.min(
                frames.length - 1,
                Math.floor(((elapsed % loopMs) / loopMs) * frames.length),
              );
              sp.texture = frames[fi];
            };
            this.app.ticker.add(onTick);
            registerStop(() => {
              this.app.ticker?.remove(onTick);
            });
          }
        } else {
          const tex = await loadTextureFromUrl(getLevelAssetUrl(tile.image.url));
          const sp = new Sprite(tex);
          this.fitSpriteInTile(sp, tile);
          box.addChild(sp);
        }
      } catch {
        /* Ein fehlerhaftes Puzzleteil darf das restliche Brett nicht ausblenden. */
      }

      return box;
    };

    const nextBoxes: Array<Container | null> = [];
    const builtBoxes: Container[] = [];
    const tilesToBuild: Array<{ index: number; placed: PlacedTile }> = [];
    const cleanupAbandonedBuild = () => {
      for (const stop of nextStops) {
        if (!reusedStops.has(stop)) {
          stop();
        }
      }
      for (const box of builtBoxes) {
        box.destroy({ children: true });
      }
    };
    for (const placed of placedTiles) {
      const reused = tryReusePlacedBox(placed);
      if (reused) {
        nextBoxes.push(reused);
      } else {
        const index = nextBoxes.length;
        nextBoxes.push(null);
        tilesToBuild.push({ index, placed });
      }
    }

    if (buildInParallel) {
      const boxes = await Promise.all(
        tilesToBuild.map(({ placed }) => buildOne(placed)),
      );
      for (let i = 0; i < boxes.length; i++) {
        const box = boxes[i];
        if (box) {
          const slot = tilesToBuild[i];
          if (slot) {
            nextBoxes[slot.index] = box;
            builtBoxes.push(box);
          }
        }
      }
    } else {
      for (const { index, placed } of tilesToBuild) {
        if (generation !== this.placedRebuildGeneration) {
          cleanupAbandonedBuild();
          return;
        }
        const box = await buildOne(placed);
        if (box) {
          nextBoxes[index] = box;
          builtBoxes.push(box);
        }
      }
    }

    if (generation !== this.placedRebuildGeneration) {
      cleanupAbandonedBuild();
      return;
    }

    const nextStopSet = new Set(nextStops);
    for (const stop of this.placedTickerStops) {
      if (!nextStopSet.has(stop)) {
        stop();
      }
    }

    const finalBoxes = nextBoxes.filter((box): box is Container => Boolean(box));
    const finalBoxSet = new Set(finalBoxes);
    for (const ch of [...this.placedLayer.children]) {
      if (!finalBoxSet.has(ch as Container)) {
        this.placedLayer.removeChild(ch);
        ch.destroy({ children: true });
      }
    }
    for (const box of finalBoxes) {
      this.placedLayer.addChild(box);
    }
    syncPlacementVideoOverlayOrder(
      this.videoOverlayHost,
      placedTiles.map((p) => p.placementKey),
    );
    this.placedTickerStops.length = 0;
    this.placedTickerStops.push(...nextStops);
  }

  private fitSpriteInTile(obj: Sprite, tile: Tile): void {
    const tw = tile.size.x;
    const th = tile.size.y;
    const bw = obj.texture.width;
    const bh = obj.texture.height;
    obj.anchor.set(0, 0);
    obj.position.set(0, 0);
    const sc = Math.max(tw / Math.max(1, bw), th / Math.max(1, bh));
    obj.scale.set(sc, sc);
  }

  clearDrag(): void {
    clearBoardDragPreview();
    this.dragTile = null;
  }

  async beginDragFromTile(
    tile: Tile,
    clientX: number,
    clientY: number,
  ): Promise<void> {
    this.clearDrag();
    this.dragTile = tile;
    if (tile.placementVideo) {
      primePlacementVideosForTile(tile);
      warmPlacementVideosForTiles([tile]);
    }
    showBoardDragPreviewForTile(tile);
    this.moveDrag(clientX, clientY);
    armBoardDragLiftFromPointer();
  }

  moveDrag(clientX: number, clientY: number): void {
    if (!this.dragTile) {
      return;
    }
    updateBoardDragPreview(
      this.videoOverlayHost,
      this.dragTile,
      clientX,
      clientY,
    );
  }

  isPointerOverDesign(clientX: number, clientY: number): boolean {
    const dv = getDesignViewRect(this.host);
    return (
      clientX >= dv.left &&
      clientX <= dv.right &&
      clientY >= dv.top &&
      clientY <= dv.bottom
    );
  }

  /** Drop-Hit am visuellen Zentrum (Lift-Offset über dem Finger). */
  pointerRef(clientX: number, clientY: number): { refX: number; refY: number } {
    return clientToRefSpace(
      clientX,
      clientY - BOARD_DRAG_LIFT_OFFSET_Y_PX,
      getDesignViewRect(this.host),
    );
  }

  destroy(): void {
    this.destroyed = true;
    setPlacementVideoPlaybackSuspended(false);
    this.clearPlacedTickers();
    teardownPlacementVideoOverlay(this.videoOverlayHost);
    teardownPlacementVideoPool();
    teardownBoardDragOverlay();
    this.clearDrag();
    if (this.boardMask) {
      this.boardMask.destroy();
      this.boardMask = null;
    }
    clearTileTextureCache();
  }
}
