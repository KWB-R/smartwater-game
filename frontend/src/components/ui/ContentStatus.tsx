import type { ReactNode } from "react";
import type { AppError } from "@/api/errors";
import { FullscreenLoadingScreen } from "@/components/ui/FullscreenLoadingScreen";
import { cn } from "@/lib/cn";

const statusBoxClassName =
  "m-4 rounded-xl bg-swg-white p-4 font-text text-base leading-tight";

type Props = {
  status: "idle" | "loading" | "success" | "error";
  error?: AppError;
  empty?: boolean;
  emptyMessage?: string;
  children: ReactNode;
};

export function ContentStatus({
  status,
  error,
  empty,
  emptyMessage = "Keine Inhalte verfügbar.",
  children,
}: Props) {
  if (status === "loading" || status === "idle") {
    return <FullscreenLoadingScreen />;
  }
  if (status === "error" && error) {
    return (
      <div
        className={cn(statusBoxClassName, "border border-red-300 text-red-900")}
        role="alert"
      >
        <p>{error.message}</p>
        {error.status ? (
          <p className="mt-2 text-[0.8125rem] opacity-85">
            HTTP {error.status}
          </p>
        ) : null}
      </div>
    );
  }
  if (empty) {
    return (
      <p className={cn(statusBoxClassName, "text-swg-black text-center opacity-85")}>
        {emptyMessage}
      </p>
    );
  }
  return <>{children}</>;
}
