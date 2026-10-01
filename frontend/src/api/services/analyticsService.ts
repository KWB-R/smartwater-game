import { StrapiFetchError, strapiFetch } from "@/api/client";
import { hasAnalyticsConsent } from "@/features/analytics/analyticsConsent";
import { isStrapiConfigured } from "@/lib/env";
import type {
  AnalyticsAuthLoginResponse,
  AnalyticsAuthSetupResponse,
  AnalyticsAuthSuccessResponse,
  AnalyticsLoginResult,
  AnalyticsSummary,
  AnalyticsTrackPayload,
} from "@/features/analytics/types";

const AUTH_STORAGE_KEY = "swg:analytics:jwt";

export function readAnalyticsJwt(): string | null {
  if (typeof sessionStorage === "undefined") {
    return null;
  }
  try {
    const value = sessionStorage.getItem(AUTH_STORAGE_KEY);
    return value?.trim() || null;
  } catch {
    return null;
  }
}

function writeAnalyticsJwt(jwt: string | null): void {
  if (typeof sessionStorage === "undefined") {
    return;
  }
  try {
    if (!jwt) {
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      return;
    }
    sessionStorage.setItem(AUTH_STORAGE_KEY, jwt);
  } catch {
    // Auch bei gesperrtem oder vollem Browserspeicher fortfahren.
  }
}

/** Sendet Statistikereignisse im Hintergrund; Fehler unterbrechen die App nicht. */
export async function trackAnalyticsEvent(
  payload: AnalyticsTrackPayload,
): Promise<void> {
  if (!isStrapiConfigured() || !hasAnalyticsConsent()) {
    return;
  }
  try {
    await strapiFetch<{ ok?: boolean }>("/analytics/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Fehler der Statistik dürfen die App nicht blockieren.
  }
}

/** Prüft das Passwort und liefert die nächste TOTP-Prüfung oder Einrichtung. */
export async function loginAnalyticsPassword(
  identifier: string,
  password: string,
): Promise<AnalyticsAuthLoginResponse> {
  const raw = await strapiFetch<AnalyticsAuthLoginResponse>(
    "/analytics/auth/login",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ identifier, password }),
    },
  );
  if (
    !raw ||
    (raw.status !== "totp_required" && raw.status !== "setup_required") ||
    !raw.challengeToken
  ) {
    throw new StrapiFetchError("Login failed", 401);
  }
  return raw;
}

/** Prüft den TOTP-Code nach erfolgreicher Passwortprüfung. */
export async function verifyAnalyticsTotp(
  challengeToken: string,
  code: string,
): Promise<AnalyticsLoginResult> {
  const raw = await strapiFetch<AnalyticsAuthSuccessResponse>(
    "/analytics/auth/totp",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ challengeToken, code }),
    },
  );
  if (raw?.status !== "authenticated" || !raw.jwt) {
    throw new StrapiFetchError("TOTP verification failed", 401);
  }
  writeAnalyticsJwt(raw.jwt);
  return { jwt: raw.jwt, user: raw.user };
}

/** Liefert QR-Code und Schlüssel für die erstmalige TOTP-Einrichtung. */
export async function setupAnalyticsTotp(
  challengeToken: string,
): Promise<AnalyticsAuthSetupResponse> {
  const raw = await strapiFetch<AnalyticsAuthSetupResponse>(
    "/analytics/auth/totp/setup",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ challengeToken }),
    },
  );
  if (raw?.status !== "setup" || !raw.challengeToken || !raw.qrDataUrl) {
    throw new StrapiFetchError("TOTP setup failed", 401);
  }
  return raw;
}

/** Bestätigt die TOTP-Einrichtung und liefert ein JWT. */
export async function confirmAnalyticsTotp(
  challengeToken: string,
  code: string,
): Promise<AnalyticsLoginResult> {
  const raw = await strapiFetch<AnalyticsAuthSuccessResponse>(
    "/analytics/auth/totp/confirm",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ challengeToken, code }),
    },
  );
  if (raw?.status !== "authenticated" || !raw.jwt) {
    throw new StrapiFetchError("TOTP confirm failed", 401);
  }
  writeAnalyticsJwt(raw.jwt);
  return { jwt: raw.jwt, user: raw.user };
}

export function logoutAnalytics(): void {
  writeAnalyticsJwt(null);
}

export async function fetchAnalyticsSummary(options?: {
  from?: string;
  to?: string;
  dayLimit?: number;
  dayOffset?: number;
  signal?: AbortSignal;
}): Promise<AnalyticsSummary> {
  const jwt = readAnalyticsJwt();
  if (!jwt) {
    throw new StrapiFetchError("Authentication required", 401);
  }
  const params = new URLSearchParams();
  if (options?.from) params.set("from", options.from);
  if (options?.to) params.set("to", options.to);
  if (options?.dayLimit != null) {
    params.set("dayLimit", String(options.dayLimit));
  }
  if (options?.dayOffset != null) {
    params.set("dayOffset", String(options.dayOffset));
  }
  const qs = params.toString();
  const path = qs ? `/analytics/summary?${qs}` : "/analytics/summary";
  return strapiFetch<AnalyticsSummary>(path, {
    signal: options?.signal,
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
  });
}
