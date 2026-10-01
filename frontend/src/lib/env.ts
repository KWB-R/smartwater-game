import { z } from "zod";

const optionalUrlSchema = z.preprocess(
  (value) => typeof value === "string" && !value.trim() ? undefined : value,
  z.string().url().optional(),
);

const envSchema = z.object({
  VITE_STRAPI_BASE_URL: optionalUrlSchema,
  VITE_API_BASE_URL: optionalUrlSchema,
  VITE_STRAPI_URL: optionalUrlSchema,
  VITE_COMBO_VIDEO_BASE_URL: optionalUrlSchema,
  VITE_APP_ENV: z
    .enum(["development", "staging", "production", "test"])
    .optional(),
});

type AppEnv = z.infer<typeof envSchema>;

let cached: AppEnv | null = null;

function readEnv(): AppEnv {
  if (cached) return cached;
  cached = envSchema.parse(import.meta.env);
  return cached;
}

function isPwaDevProxyMode(): boolean {
  return (
    import.meta.env.DEV === true && import.meta.env.VITE_PWA_DEV === "true"
  );
}

/** CMS-Basis ohne abschließenden Schrägstrich für die Auflösung von Medien-URLs. */
export function getStrapiOrigin(): string | undefined {
  if (isPwaDevProxyMode() && typeof window !== "undefined") {
    return window.location.origin;
  }
  const env = readEnv();
  const base =
    env.VITE_STRAPI_BASE_URL?.replace(/\/$/, "") ??
    env.VITE_STRAPI_URL?.replace(/\/$/, "");
  return base || undefined;
}

/** REST-API-Basis inkl. `/api`. */
export function getStrapiApiBase(): string | undefined {
  if (isPwaDevProxyMode() && typeof window !== "undefined") {
    return `${window.location.origin}/api`;
  }
  const env = readEnv();
  if (env.VITE_API_BASE_URL) {
    return env.VITE_API_BASE_URL.replace(/\/$/, "");
  }
  const origin = getStrapiOrigin();
  return origin ? `${origin}/api` : undefined;
}

export function isStrapiConfigured(): boolean {
  return getStrapiApiBase() !== undefined;
}

/**
 * Basis für vorgefertigte Kombivideos in der Ordnerstruktur von assetsFolder.
 * In der Entwicklung gilt ohne Vorgabe Port 8787 am Hostnamen der geöffneten App.
 */
const COMBO_VIDEO_DEV_PORT = 8787;

function devComboVideoBaseUrl(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname?.trim();
    if (host) {
      return `http://${host}:${COMBO_VIDEO_DEV_PORT}`;
    }
  }
  return `http://127.0.0.1:${COMBO_VIDEO_DEV_PORT}`;
}

export function getComboVideoBaseUrl(): string | undefined {
  const env = readEnv();
  const configured = env.VITE_COMBO_VIDEO_BASE_URL?.trim().replace(/\/+$/, "");
  if (configured) {
    return configured;
  }
  if (import.meta.env.DEV) {
    return devComboVideoBaseUrl();
  }
  return undefined;
}
