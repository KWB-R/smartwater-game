import type { Tile } from "@/features/level/types";
import {
  getLevelAssetUrl,
  getTileLibraryPreviewMedia,
  isSpritesheet,
} from "@/features/level/services/levelAssetUrls";
import {
  frameIndexToBackgroundPercent,
  getSpriteGridRows,
} from "@/components/features/level/TileSpriteVisual";
import { preloadImageDecode } from "@/features/level/utils/preloadImageDecode";
import {
  resolveMediaPlaybackUrlSync,
  resolveOfflineMediaPlaybackUrl,
} from "@/pwa/resolveOfflineMediaPlaybackUrl";
import {
  boardLayoutFitForHost,
  scaleForHost,
} from "@/components/features/level/scene/bridge/designViewRect";

/** Entspricht der 100-Pixel-Vorschau im Bibliotheksstreifen. */
const LIBRARY_STRIP_DRAG_PREVIEW_CSS_PX = 100;

/**
 * Hebt das Teil relativ zum Finger an, damit es beim Ziehen sichtbar bleibt.
 */
export const BOARD_DRAG_LIFT_OFFSET_Y_PX = 65;

const PIECE_LIFT_CLASS = "level-board-drag-overlay__piece--lifted";

const VIEWPORT_DRAG_ROOT_ID = "level-viewport-drag-overlay";

type DragOverlayState = {
  root: HTMLDivElement;
  piece: HTMLDivElement;
  img: HTMLImageElement;
  sprite: HTMLDivElement;
};

let viewportDragState: DragOverlayState | null = null;
let pendingLiftFrame = 0;
/** Brettgröße vor dem Start der Anhebe- und Vergrößerungsanimation. */
let pendingBoardSizePx: { w: number; h: number } | null = null;
let boardSizeArmed = false;

function ensureViewportDragOverlay(): DragOverlayState {
  if (viewportDragState) {
    return viewportDragState;
  }
  const root = document.createElement("div");
  root.id = VIEWPORT_DRAG_ROOT_ID;
  root.className = "level-board-drag-overlay";
  root.hidden = true;
  const piece = document.createElement("div");
  piece.className = "level-board-drag-overlay__piece";
  const img = document.createElement("img");
  img.alt = "";
  img.draggable = false;
  img.setAttribute("draggable", "false");
  img.style.setProperty("-webkit-user-drag", "none");
  img.style.userSelect = "none";
  const sprite = document.createElement("div");
  sprite.className =
    "level-board-drag-overlay__sprite level-tile-sprite level-tile-sprite--strip level-tile-sprite--in-float";
  sprite.setAttribute("aria-hidden", "true");
  piece.appendChild(sprite);
  piece.appendChild(img);
  root.appendChild(piece);
  document.body.appendChild(root);
  viewportDragState = { root, piece, img, sprite };
  return viewportDragState;
}

function cancelPendingLift(): void {
  if (pendingLiftFrame !== 0) {
    cancelAnimationFrame(pendingLiftFrame);
    pendingLiftFrame = 0;
  }
}

function applyBoardSize(piece: HTMLDivElement, size: { w: number; h: number }): void {
  piece.style.width = `${size.w}px`;
  piece.style.height = `${size.h}px`;
}

/**
 * Startet in Bibliotheksgröße am Finger und animiert Höhe und Brettgröße.
 * Die Position folgt währenddessen weiter dem Zeiger.
 */
export function armBoardDragLiftFromPointer(): void {
  const state = viewportDragState;
  if (!state) {
    return;
  }
  cancelPendingLift();
  state.piece.classList.remove(PIECE_LIFT_CLASS);
  // Den Ausgangszustand einmal zeichnen, damit der Browser den Übergang animiert.
  void state.piece.offsetWidth;
  pendingLiftFrame = requestAnimationFrame(() => {
    pendingLiftFrame = 0;
    state.piece.classList.add(PIECE_LIFT_CLASS);
    if (pendingBoardSizePx) {
      applyBoardSize(state.piece, pendingBoardSizePx);
    }
    boardSizeArmed = true;
  });
}

/** Zeigt dieselbe Vorschau wie die Bibliothek; bei Spritesheets nur das passende Rasterbild. */
export function showBoardDragPreviewForTile(tile: Tile): void {
  const { piece, img, sprite, root } = ensureViewportDragOverlay();
  const media = getTileLibraryPreviewMedia(tile);

  cancelPendingLift();
  boardSizeArmed = false;
  pendingBoardSizePx = null;
  piece.classList.remove(PIECE_LIFT_CLASS);
  piece.style.width = `${LIBRARY_STRIP_DRAG_PREVIEW_CSS_PX}px`;
  piece.style.height = `${LIBRARY_STRIP_DRAG_PREVIEW_CSS_PX}px`;
  root.hidden = false;
  piece.hidden = false;

  if (isSpritesheet(media)) {
    img.style.display = "none";
    img.removeAttribute("src");
    sprite.style.display = "block";
    const url = getLevelAssetUrl(media.url);
    const cols = Math.max(1, media.gridColumns);
    const rows = getSpriteGridRows(media);
    const { x, y } = frameIndexToBackgroundPercent(0, cols, rows);
    const applyBg = (src: string) => {
      sprite.style.backgroundImage = `url("${src}")`;
    };
    applyBg(resolveMediaPlaybackUrlSync(url));
    void resolveOfflineMediaPlaybackUrl(url).then(applyBg).catch(() => {});
    sprite.style.backgroundSize = `${cols * 100}% ${rows * 100}%`;
    sprite.style.backgroundPosition = `${x}% ${y}%`;
    sprite.style.backgroundRepeat = "no-repeat";
    sprite.style.aspectRatio = `${media.frameSize.x} / ${media.frameSize.y}`;
    void preloadImageDecode(url).catch(() => {});
    return;
  }

  sprite.style.display = "none";
  sprite.style.backgroundImage = "";
  img.style.display = "block";
  const url = getLevelAssetUrl(media.url);
  img.src = resolveMediaPlaybackUrlSync(url);
  void resolveOfflineMediaPlaybackUrl(url)
    .then((resolved) => {
      img.src = resolved;
    })
    .catch(() => {});
  void preloadImageDecode(url).catch(() => {});
}

export function updateBoardDragPreview(
  designFrameHost: HTMLElement,
  tile: Tile,
  clientX: number,
  clientY: number,
): void {
  const state = viewportDragState;
  if (!state) {
    return;
  }
  const { piece } = state;
  piece.style.left = `${clientX}px`;
  piece.style.top = `${clientY}px`;

  const fit = boardLayoutFitForHost(designFrameHost);
  const s = scaleForHost(
    designFrameHost.clientWidth,
    designFrameHost.clientHeight,
    fit,
  );
  pendingBoardSizePx = {
    w: tile.size.x * s,
    h: tile.size.y * s,
  };
  // Die Brettgröße schon beim Ziehstart aktivieren.
  if (boardSizeArmed) {
    applyBoardSize(piece, pendingBoardSizePx);
  }
}

export function clearBoardDragPreview(): void {
  const state = viewportDragState;
  if (!state) {
    return;
  }
  cancelPendingLift();
  boardSizeArmed = false;
  pendingBoardSizePx = null;
  state.piece.classList.remove(PIECE_LIFT_CLASS);
  state.img.removeAttribute("src");
  state.img.style.display = "";
  state.sprite.style.display = "none";
  state.sprite.style.backgroundImage = "";
  state.root.hidden = true;
  state.piece.hidden = true;
}

export function teardownBoardDragOverlay(): void {
  if (!viewportDragState) {
    return;
  }
  cancelPendingLift();
  boardSizeArmed = false;
  pendingBoardSizePx = null;
  viewportDragState.root.remove();
  viewportDragState = null;
}
