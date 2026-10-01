import { getStrapiApiBase } from "@/lib/env";

export class StrapiFetchError extends Error {
  readonly kind = "strapi" as const;
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "StrapiFetchError";
    this.status = status;
  }
}

export async function strapiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const apiBase = getStrapiApiBase();
  if (!apiBase) {
    throw new StrapiFetchError(
      "Strapi API base URL is not configured (VITE_API_BASE_URL or VITE_STRAPI_BASE_URL)",
      0,
    );
  }
  const suffix = path.startsWith("/") ? path : `/${path}`;
  const url = path.startsWith("http") ? path : `${apiBase}${suffix}`;
  const timeoutMs = 45_000;
  const timeoutSignal =
    typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
      ? AbortSignal.timeout(timeoutMs)
      : undefined;
  const signals = [init?.signal, timeoutSignal].filter(
    (s): s is AbortSignal => s != null,
  );
  const signal =
    signals.length > 1 && typeof AbortSignal.any === "function"
      ? AbortSignal.any(signals)
      : (signals[0] ?? init?.signal);

  const res = await fetch(url, {
    ...init,
    signal,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    throw new StrapiFetchError(
      res.statusText || "Strapi request failed",
      res.status,
    );
  }
  return (await res.json()) as T;
}
