import { getStrapiOrigin } from "@/lib/env";

/** Einheitliches crossOrigin für CMS-Medien, damit Vorladen und Service-Worker-Cache zusammenpassen. */
export function strapiImgCrossOrigin(
  url: string | null | undefined,
): "anonymous" | undefined {
  const s = url?.trim();
  if (!s || typeof window === "undefined") {
    return undefined;
  }
  const strapi = getStrapiOrigin()?.replace(/\/$/, "");
  if (!strapi) {
    return undefined;
  }
  try {
    const mediaOrigin = new URL(s, window.location.href).origin;
    if (mediaOrigin === window.location.origin) {
      return undefined;
    }
    const cmsOrigin = new URL(strapi).origin;
    if (mediaOrigin === cmsOrigin) {
      return "anonymous";
    }
  } catch {
    return undefined;
  }
  return undefined;
}
