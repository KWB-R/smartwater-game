/**
 * Protokolliert abgefangene Fehler in der Entwicklung, ohne das vorgesehene Ersatzverhalten zu ändern.
 */
export function logError(scope: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.warn(`[${scope}]`, error);
  }
}
