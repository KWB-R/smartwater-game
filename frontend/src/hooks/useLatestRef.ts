import { useInsertionEffect, useRef, type MutableRefObject } from "react";

/**
 * Ref mit dem jeweils aktuellen Wert, ohne Schreibzugriff während des Renderns.
 * useInsertionEffect aktualisiert sie vor Layout-Effekten, Zeichnen und späteren Ereignissen.
 */
export function useLatestRef<T>(value: T): MutableRefObject<T> {
  const ref = useRef(value);
  useInsertionEffect(() => {
    ref.current = value;
  });
  return ref;
}

/**
 * Aktualisiert wie useLatestRef eine bereits vorhandene Ref.
 * Das erlaubt ihre Verwendung in früher definierten Callbacks.
 */
export function useSyncRef<T>(ref: MutableRefObject<T>, value: T): void {
  useInsertionEffect(() => {
    ref.current = value;
  });
}
