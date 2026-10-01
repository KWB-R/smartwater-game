import { useEffect, useSyncExternalStore } from "react";

let activeCount = 0;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): boolean {
  return activeCount > 0;
}

/** Meldet die aktive 404-Seite, damit der Desktop-QR-Code auf die Startseite verweist. */
export function useRegisterNotFoundPage(): void {
  useEffect(() => {
    activeCount += 1;
    emit();
    return () => {
      activeCount -= 1;
      emit();
    };
  }, []);
}

/** true, solange NotFoundPage eingebunden ist. */
export function useNotFoundPageActive(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
