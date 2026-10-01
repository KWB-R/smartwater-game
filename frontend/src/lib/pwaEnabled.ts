/** Aktiviert PWA-Funktionen im Build oder ausdrücklich mit VITE_PWA_DEV=true. */
export function isPwaOfflineEnabled(): boolean {
  if (import.meta.env.PROD) {
    return true;
  }
  return import.meta.env.VITE_PWA_DEV === "true";
}
