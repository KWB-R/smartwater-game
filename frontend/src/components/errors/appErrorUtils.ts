import { isRouteErrorResponse } from "react-router-dom";

export function getAppErrorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return "Seite nicht gefunden.";
    }
    return error.statusText || `Fehler ${error.status}`;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "Ein unerwarteter Fehler ist aufgetreten.";
}

export function shouldRedirectRouteErrorToHome(error: unknown): boolean {
  return isRouteErrorResponse(error) && error.status === 404;
}
