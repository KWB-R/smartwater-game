import { resolveStrapiMediaUrl } from "@/api/media";

export function absoluteMediaUrl(url: string): string {
  const resolved = resolveStrapiMediaUrl(url);
  return new URL(
    resolved,
    typeof window !== "undefined" ? window.location.href : undefined,
  ).href;
}

/** Berücksichtigt die beim Vorladen und bei Browserabrufen verwendeten Request-Modi. */
export function cacheKeysForUrl(absolute: string): (string | Request)[] {
  return [
    absolute,
    new Request(absolute, { method: "GET" }),
    new Request(absolute, {
      method: "GET",
      mode: "cors",
      credentials: "same-origin",
    }),
    new Request(absolute, {
      method: "GET",
      mode: "no-cors",
      credentials: "same-origin",
    }),
  ];
}
