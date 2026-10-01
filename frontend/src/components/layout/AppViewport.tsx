import { Suspense, type ReactNode } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { FullscreenLoadingScreen } from "@/components/ui/FullscreenLoadingScreen";
import { useShowsAppPhoneFrame } from "@/hooks/useShowsAppPhoneFrame";
import { APP_VIEWPORT_ID, usesFullAppViewport } from "@/lib/appViewport";
import { cn } from "@/lib/cn";
import { DesktopFrameAside } from "@/components/layout/DesktopFrameAside";

type AppViewportFrameProps = {
  pathname: string;
  children: ReactNode;
};

/**
 * Füllt auf Mobilgeräten den Viewport. Auf größeren Geräten mit Maus erscheint ein Smartphone-Rahmen.
 * Im Querformat auf Touchgeräten wird wieder die volle Fläche verwendet.
 * Ausnahmen legt usesFullAppViewport fest; Safe-Area-Abstände werden an den Komponenten gesetzt.
 */
function AppViewportFrame({ pathname, children }: AppViewportFrameProps) {
  const fullViewport = usesFullAppViewport(pathname);

  return (
    <div
      id={APP_VIEWPORT_ID}
      className={cn("app-viewport", fullViewport && "app-viewport--full")}
    >
      {children}
    </div>
  );
}

/** Layout der obersten Route; muss innerhalb von RouterProvider gerendert werden. */
export function AppViewportRoot() {
  const { pathname } = useLocation();
  const showPhoneFrame = useShowsAppPhoneFrame(pathname);

  const frame = (
    <AppViewportFrame pathname={pathname}>
      <Suspense fallback={<FullscreenLoadingScreen inline />}>
        <Outlet />
      </Suspense>
    </AppViewportFrame>
  );

  if (!showPhoneFrame) {
    return frame;
  }

  return (
    <div className="app-desktop-chrome">
      {frame}

      <DesktopFrameAside />
    </div>
  );
}
