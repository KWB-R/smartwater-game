/**
 * Sicherer Zugriff auf localStorage und sessionStorage.
 * Fängt fehlende APIs sowie Speicherlimits und Zugriffssperren ab; Schlüssel stehen in storageKeys.ts.
 */
export type SafeStorage = {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  /** JSON lesen; `parse` validiert und gibt bei ungültigen Daten `null` zurück. */
  getJson<T>(key: string, parse: (value: unknown) => T | null): T | null;
  /** Schreibt JSON; false bei gesperrtem oder vollem Browserspeicher. */
  setJson(key: string, value: unknown): boolean;
};

function createSafeStorage(getBacking: () => Storage): SafeStorage {
  const backing = (): Storage | null => {
    try {
      return getBacking() ?? null;
    } catch {
      return null;
    }
  };
  return {
    get(key) {
      try {
        return backing()?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        backing()?.setItem(key, value);
      } catch {
        /* Ein voller oder gesperrter Browserspeicher darf die App nicht unterbrechen. */
      }
    },
    remove(key) {
      try {
        backing()?.removeItem(key);
      } catch {
        /* Auch bei gesperrtem Browserspeicher fortfahren. */
      }
    },
    getJson(key, parse) {
      try {
        const raw = backing()?.getItem(key);
        if (!raw) {
          return null;
        }
        return parse(JSON.parse(raw));
      } catch {
        return null;
      }
    },
    setJson(key, value) {
      try {
        const storage = backing();
        if (!storage) {
          return false;
        }
        storage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
  };
}

export const localStore = createSafeStorage(() => localStorage);
export const sessionStore = createSafeStorage(() => sessionStorage);
