import { isStandaloneDisplayMode } from "@/pwa/offlineContentSync";
import { useSyncExternalStore } from "react";

const DISPLAY_MODE_QUERIES = [
  "(display-mode: standalone)",
  "(display-mode: fullscreen)",
  "(display-mode: minimal-ui)",
  "(display-mode: window-controls-overlay)",
] as const;

function subscribeToDisplayMode(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  const media = DISPLAY_MODE_QUERIES.map((query) => window.matchMedia(query));
  const onChange = () => onStoreChange();
  media.forEach((mq) => mq.addEventListener("change", onChange));
  return () => media.forEach((mq) => mq.removeEventListener("change", onChange));
}

function getStandaloneSnapshot(): boolean {
  return isStandaloneDisplayMode();
}

/** Beim ersten Render eine installierte App annehmen, damit der Installationshinweis in der PWA nicht aufblitzt. */
function getStandaloneServerSnapshot(): boolean {
  return true;
}

export function useShowWebAppInstallHint(): boolean {
  const isStandalone = useSyncExternalStore(
    subscribeToDisplayMode,
    getStandaloneSnapshot,
    getStandaloneServerSnapshot,
  );
  return !isStandalone;
}
