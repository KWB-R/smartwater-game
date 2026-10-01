import { getStrapiOrigin } from "@/lib/env";

/**
 * Lädt Strapi-Uploads in der Entwicklung über den Vite-Proxy unter /uploads.
 * Das ermöglicht SVG-Abrufe unter derselben Origin und vermeidet Mixed Content bei HTTPS.
 */
function rewriteCmsUploadUrlToAppOrigin(absoluteUrl: string): string {
  if (!import.meta.env.DEV || typeof window === "undefined") {
    return absoluteUrl;
  }
  try {
    const parsed = new URL(absoluteUrl);
    if (!parsed.pathname.startsWith("/uploads/")) {
      return absoluteUrl;
    }
    const appOrigin = window.location.origin;
    if (parsed.origin === appOrigin) {
      return absoluteUrl;
    }
    return `${appOrigin}${parsed.pathname}${parsed.search}`;
  } catch {
    return absoluteUrl;
  }
}

/**
 * Kombiniert relative Strapi-Medien-URLs mit der CMS-Basis-URL.
 */
export function resolveStrapiMediaUrl(url: string | null | undefined): string {
  const strapiOrigin = getStrapiOrigin()?.replace(/\/$/, "") ?? "";
  const s = String(url ?? "").trim();
  if (s === "") return "";
  if (/^https?:\/\//i.test(s) || s.startsWith("data:") || s.startsWith("blob:")) {
    return rewriteCmsUploadUrlToAppOrigin(s);
  }
  if (s.startsWith("//")) {
    const protocolRelative =
      typeof window !== "undefined" && window.location?.protocol
        ? `${window.location.protocol}${s}`
        : strapiOrigin
          ? `${strapiOrigin.replace(/^http:/, "https:")}${s}`
          : `https:${s}`;
    return rewriteCmsUploadUrlToAppOrigin(protocolRelative);
  }
  if (s.startsWith("/") && strapiOrigin) {
    return rewriteCmsUploadUrlToAppOrigin(`${strapiOrigin}${s}`);
  }
  return s;
}
