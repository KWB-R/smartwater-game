/**
 * Fasst parallele Aufrufe mit demselben Schlüssel zu einem Promise zusammen.
 * Nach Abschluss wird der Eintrag entfernt; Ergebnisse werden nicht zwischengespeichert.
 */
export function dedupeInflight<Args extends readonly unknown[], T>(
  load: (...args: Args) => Promise<T>,
  keyFor: (...args: Args) => string = (...args) => JSON.stringify(args),
): (...args: Args) => Promise<T> {
  const inflight = new Map<string, Promise<T>>();
  return (...args: Args) => {
    const key = keyFor(...args);
    const existing = inflight.get(key);
    if (existing) {
      return existing;
    }
    const request = load(...args).finally(() => {
      inflight.delete(key);
    });
    inflight.set(key, request);
    return request;
  };
}
