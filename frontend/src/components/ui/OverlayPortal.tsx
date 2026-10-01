import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { getAppViewportElement } from "@/lib/appViewport";

/**
 * Gemeinsame Portal- und Hintergrundkomponenten für Overlays.
 * Die Ebenen verwenden die zentralen Variablen wie --z-overlay-backdrop und --z-overlay.
 */

type OverlayPortalTarget =
  /** Phone-Frame-Viewport (`#app-viewport`) — Overlay bleibt im App-Rahmen. */
  | "appViewport"
  /** `document.body` — Overlay liegt über allem, auch außerhalb des Rahmens. */
  | "body";

type OverlayPortalProps = {
  target?: OverlayPortalTarget;
  /** Ein ausdrücklich angegebener Container hat Vorrang vor target. */
  container?: HTMLElement | null;
  children: ReactNode;
};

export function OverlayPortal({
  target = "appViewport",
  container,
  children,
}: OverlayPortalProps) {
  if (typeof document === "undefined") {
    return null;
  }
  const node =
    container ?? (target === "body" ? document.body : getAppViewportElement());
  return createPortal(children, node);
}

type OverlayBackdropProps = {
  /** Mit Aktion ist der Hintergrund eine Schließen-Schaltfläche, sonst nur eine Abdunklung. */
  onClick?: () => void;
  className?: string;
};

export function OverlayBackdrop({ onClick, className }: OverlayBackdropProps) {
  const layerClass = cn(
    "pointer-events-auto fixed inset-0 z-(--z-overlay-backdrop) bg-slate-900/45",
    className,
  );
  if (onClick) {
    return (
      <button
        type="button"
        className={cn(layerClass, "border-0")}
        aria-label="Schließen"
        onClick={onClick}
      />
    );
  }
  return <div className={layerClass} aria-hidden />;
}

type OverlayCenterLayerProps = {
  className?: string;
  children: ReactNode;
};

/**
 * Zentrierte Vollbildebene über dem Hintergrund.
 * Klicks werden durchgereicht; das darin liegende Panel aktiviert seine eigene Bedienung.
 */
export function OverlayCenterLayer({
  className,
  children,
}: OverlayCenterLayerProps) {
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-0 z-(--z-overlay) flex items-center justify-center p-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
