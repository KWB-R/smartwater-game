import { Application, Container, type Ticker } from "pixi.js";
import {
  boardLayoutFitForHost,
  originForHost,
  scaleForHost,
} from "../bridge/designViewRect";

export type BoardPixiHandle = {
  app: Application;
  world: Container;
  destroy: () => void;
  disconnectResize: () => void;
  layout: () => void;
};

export async function createBoardApp(
  host: HTMLElement,
): Promise<BoardPixiHandle> {
  for (const child of Array.from(host.children)) {
    if (child.tagName === "CANVAS") host.removeChild(child);
  }
  const app = new Application();
  await app.init({
    resizeTo: host,
    backgroundAlpha: 0,

    antialias: true,
    autoDensity: true,
    resolution: Math.min(2, window.devicePixelRatio || 1),
    preference: "webgl",
  });
  const canvasEl = app.canvas as HTMLCanvasElement;
  canvasEl.style.background = "transparent";
  canvasEl.style.backgroundColor = "transparent";
  host.appendChild(canvasEl);

  const world = new Container();
  app.stage.addChild(world);
  const { layout, disconnectResize } = attachBoardWorldResize(host, app, world);

  const destroy = () => {
    disconnectResize();
    app.destroy(true, { children: true, texture: false });
  };

  return { app, world, destroy, disconnectResize, layout };
}

export function pauseBoardAppRendering(app: Application): void {
  app.ticker.stop();
}

export function resumeBoardAppRendering(
  app: Application,
  host: HTMLElement,
  ticker?: Ticker,
): void {
  if ("resizeTo" in app && typeof app.resize === "function") {
    app.resizeTo = host;
  }
  const t = ticker ?? app.ticker;
  if (!t.started) {
    t.start();
  }
}

function attachBoardWorldResize(
  host: HTMLElement,
  app: Application,
  world: Container,
  options?: { deferInitialLayout?: boolean },
): { layout: () => void; disconnectResize: () => void } {
  const layout = () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (w <= 0 || h <= 0) {
      return;
    }
    const fit = boardLayoutFitForHost(host);
    const s = scaleForHost(w, h, fit);
    const { ox, oy } = originForHost(w, h, s, fit);
    world.scale.set(s, s);
    world.position.set(ox, oy);
    try {
      if ("resize" in app && typeof app.resize === "function") {
        app.resize();
      }
    } catch {
      /* Renderer kann nach Canvas-Transfer kurz instabil sein */
    }
  };
  const ro = new ResizeObserver(() => {
    layout();
  });
  ro.observe(host);
  if (!options?.deferInitialLayout) {
    layout();
  }
  return { layout, disconnectResize: () => ro.disconnect() };
}
