import { ROUTES } from "@/routes/paths";

export const APP_VIEWPORT_ID = "app-viewport";

/** Routen mit voller Browserfläche ohne Smartphone-Rahmen. */
export function usesFullAppViewport(pathname: string): boolean {
  return (
    pathname === ROUTES.debugLichtenbergLayout ||
    pathname === ROUTES.analytics ||
    pathname.startsWith(`${ROUTES.analytics}/`)
  );
}

export function getAppViewportElement(): HTMLElement {
  return (
    document.getElementById(APP_VIEWPORT_ID) ??
    document.getElementById("root") ??
    document.body
  );
}

/** Bildschirmrechteck des App-Viewports; auf Desktop durch den Smartphone-Rahmen begrenzt. */
export type AppViewportBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function measureAppViewportBox(): AppViewportBox {
  if (typeof document === "undefined") {
    return { left: 0, top: 0, width: 0, height: 0 };
  }
  const rect = getAppViewportElement().getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}
