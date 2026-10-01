import { useCallback, useEffect, useState } from "react";
import type { AppError } from "@/api/errors";
import { toAppError } from "@/api/errors";

export type AsyncResourceState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: AppError };

export function useAsyncResource<T>(
  /** `signal` an `strapiFetch`/`fetch` durchreichen, um veraltete Requests abzubrechen. */
  loader: (signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[],
): AsyncResourceState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncResourceState<T>>({ status: "idle" });
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => {
    setTick((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setState({ status: "loading" });
    void loader(controller.signal)
      .then((data) => {
        if (!cancelled) setState({ status: "success", data });
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ status: "error", error: toAppError(error) });
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Abhängigkeiten legt der Aufrufer fest
  }, [...deps, tick]);

  return { ...state, reload };
}
