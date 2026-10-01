/** Design-Board — config.json-Koordinaten werden hierhin skaliert. */
export const DESIGN_W = 2048;
export const DESIGN_H = 2048;

export type BoardLayoutFit = "contain" | "cover" | "heightFill";

export function boardLayoutFitForHost(host: HTMLElement): BoardLayoutFit {
  return host.closest(".level-scene--share") ? "cover" : "heightFill";
}

/** Skala: gesamtes Design (2048×2048) sichtbar im Host (Contain). */
function containScaleForHost(hostWidth: number, hostHeight: number): number {
  if (hostWidth <= 0 || hostHeight <= 0) return 1;
  return Math.min(hostWidth / DESIGN_W, hostHeight / DESIGN_H);
}

/** Skala: Design-Höhe füllt den Host; seitlich ggf. abgeschnitten. */
function heightFillScaleForHost(hostWidth: number, hostHeight: number): number {
  if (hostWidth <= 0 || hostHeight <= 0) return 1;
  return hostHeight / DESIGN_H;
}

/** Skala: Design füllt den Host (Cover), Ränder werden abgeschnitten. */
function coverScaleForHost(hostWidth: number, hostHeight: number): number {
  if (hostWidth <= 0 || hostHeight <= 0) return 1;
  return Math.max(hostWidth / DESIGN_W, hostHeight / DESIGN_H);
}

export function scaleForHost(
  hostWidth: number,
  hostHeight: number,
  fit: BoardLayoutFit,
): number {
  if (fit === "cover") {
    return coverScaleForHost(hostWidth, hostHeight);
  }
  if (fit === "heightFill") {
    return heightFillScaleForHost(hostWidth, hostHeight);
  }
  return containScaleForHost(hostWidth, hostHeight);
}

/** Ursprung des Contain-Rechtecks im Host — horizontal zentriert, oben bündig. */
function containOriginForHost(
  hostWidth: number,
  _hostHeight: number,
  scale: number,
): { ox: number; oy: number } {
  return {
    ox: (hostWidth - DESIGN_W * scale) / 2,
    oy: 0,
  };
}

/** Ursprung des Cover-Rechtecks im Host — zentriert. */
function coverOriginForHost(
  hostWidth: number,
  hostHeight: number,
  scale: number,
): { ox: number; oy: number } {
  return {
    ox: (hostWidth - DESIGN_W * scale) / 2,
    oy: (hostHeight - DESIGN_H * scale) / 2,
  };
}

/** Ursprung bei heightFill — horizontal zentriert, oben bündig (wie Contain). */
function heightFillOriginForHost(
  hostWidth: number,
  _hostHeight: number,
  scale: number,
): { ox: number; oy: number } {
  return {
    ox: (hostWidth - DESIGN_W * scale) / 2,
    oy: 0,
  };
}

export function originForHost(
  hostWidth: number,
  hostHeight: number,
  scale: number,
  fit: BoardLayoutFit,
): { ox: number; oy: number } {
  if (fit === "cover") {
    return coverOriginForHost(hostWidth, hostHeight, scale);
  }
  if (fit === "heightFill") {
    return heightFillOriginForHost(hostWidth, hostHeight, scale);
  }
  return containOriginForHost(hostWidth, hostHeight, scale);
}

/**
 * Client-Rechteck des sichtbaren Designbereichs.
 * Host = `.level-design-frame` (Contain im Scene-Container) oder gleich großer Pixi-Host.
 */
export function getDesignViewRect(host: HTMLElement): DOMRect {
  const cr = host.getBoundingClientRect();
  const fit = boardLayoutFitForHost(host);
  const s = scaleForHost(cr.width, cr.height, fit);
  const vw = DESIGN_W * s;
  const vh = DESIGN_H * s;
  const { ox, oy } = originForHost(cr.width, cr.height, s, fit);
  return new DOMRect(cr.left + ox, cr.top + oy, vw, vh);
}

export type ViewportPoint = { x: number; y: number };

export type DesignPoint = { x: number; y: number };

function designPointToHostLocalPx(
  host: HTMLElement,
  designX: number,
  designY: number,
): { left: number; top: number } {
  const w = host.clientWidth;
  const h = host.clientHeight;
  const fit = boardLayoutFitForHost(host);
  const s = scaleForHost(w, h, fit);
  const { ox, oy } = originForHost(w, h, s, fit);
  return {
    left: ox + designX * s,
    top: oy + designY * s,
  };
}

/** Design-Längen (z. B. Tile-Breite) → Host-Viewport-Pixel. */
export function designSizeToHostViewportPx(
  host: HTMLElement,
  designW: number,
  designH: number,
): { width: number; height: number } {
  const w = host.clientWidth;
  const h = host.clientHeight;
  const fit = boardLayoutFitForHost(host);
  const s = scaleForHost(w, h, fit);
  return {
    width: designW * s,
    height: designH * s,
  };
}

export function designPointToViewport(
  host: HTMLElement,
  designX: number,
  designY: number,
): ViewportPoint {
  const cr = host.getBoundingClientRect();
  const local = designPointToHostLocalPx(host, designX, designY);
  return {
    x: cr.left + local.left,
    y: cr.top + local.top,
  };
}

