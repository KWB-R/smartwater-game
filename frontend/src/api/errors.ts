import { StrapiFetchError } from "@/api/client";

export type AppError = {
  kind: "network" | "strapi" | "validation" | "unknown";
  message: string;
  status?: number;
  cause?: unknown;
};

function isAppError(value: unknown): value is AppError {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    "message" in value
  );
}

export function toAppError(error: unknown, fallback = "Unbekannter Fehler"): AppError {
  if (error instanceof StrapiFetchError) {
    return {
      kind: "strapi",
      message: error.message,
      status: error.status,
      cause: error,
    };
  }
  if (isAppError(error)) return error;
  if (error instanceof Error) {
    return { kind: "unknown", message: error.message, cause: error };
  }
  return { kind: "unknown", message: fallback, cause: error };
}
