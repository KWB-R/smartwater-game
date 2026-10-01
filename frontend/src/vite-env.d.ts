/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STRAPI_BASE_URL?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_STRAPI_URL?: string;
  readonly VITE_APP_ENV?: "development" | "staging" | "production" | "test";
  readonly DEV_PANEL_ENABLED?: "true" | "false";
  readonly DEV_FAST_CELEBRATION_OVERLAYS?: "true" | "false";
  /** `true`: Service Worker + Offline-Bootstrap auch unter `pnpm dev:pwa` */
  readonly VITE_PWA_DEV?: "true" | "false";
  /** Nur PWA-Dev: Ziel für Vite-Proxy `/api` und `/uploads` (z. B. `http://127.0.0.1:1337`) */
  readonly VITE_STRAPI_PROXY_TARGET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const __APP_VERSION__: string;
declare const __APP_PKG_VERSION__: string;
declare const __APP_BUILD_DATE__: string;

declare module "virtual:pwa-register" {
  export type RegisterSWOptions = {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegistered?: (
      registration: ServiceWorkerRegistration | undefined,
    ) => void;
    onRegisterError?: (error: unknown) => void;
  };

  export function registerSW(
    options?: RegisterSWOptions,
  ): (reloadPage?: boolean) => Promise<void>;
}
