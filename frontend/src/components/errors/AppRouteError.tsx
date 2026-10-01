import { Navigate, useRouteError } from "react-router-dom";
import { AppErrorFallback } from "@/components/errors/AppErrorFallback";
import { shouldRedirectRouteErrorToHome } from "@/components/errors/appErrorUtils";

/** Eigene Fehleransicht für React Routers errorElement. */
export function AppRouteError() {
  const error = useRouteError();

  if (shouldRedirectRouteErrorToHome(error)) {
    return <Navigate to="/" replace />;
  }

  return <AppErrorFallback error={error} />;
}
