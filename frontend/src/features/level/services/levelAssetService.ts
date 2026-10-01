/**
 * Level-Medien unter `src/assets/` (Vite `import.meta.glob` + `?url`).
 *
 * **Konvention:** `levelFolder` relativ zu `src/assets/`, z. B. `lichtenberg/level_1`.
 *
 * **Placement-Video (config.json):** `placementVideo.intro` / `.loop` — je Phase ein
 * Medien-Objekt (`url`, `position`, `size`, optional `playbackRate`). WebM/MOV werden beim Auflösen abgeleitet.
 */

type UrlModuleMap = Record<string, string>;

function loadSubrepoUrlModules(): UrlModuleMap {

  return import.meta.glob(
    "../../../assets/**/*.{png,jpg,jpeg,webp,webm,mov,mp4,svg,gif}",
    {
      eager: true,
      query: "?url",
      import: "default",
    },
  ) as UrlModuleMap;
}

/** Löst einen relativen Assetpfad in die von Vite gebündelte URL auf. */
export function buildSmartwaterAssetsUrlMap(
  modules: UrlModuleMap = loadSubrepoUrlModules(),
): Map<string, string> {
  const map = new Map<string, string>();
  for (const [modulePath, url] of Object.entries(modules)) {
    const posix = modulePath.split("?")[0].replace(/\\/g, "/");
    const key = normalizeAssetSubrepoKey(posix);
    if (key) map.set(key, url);
  }
  return map;
}

function normalizeAssetSubrepoKey(posix: string): string {
  const lower = posix.toLowerCase();
  // Die importierten Pfade sind relativ zum Verzeichnis features/level/services.
  const fromServices = "../../../assets/";
  if (lower.startsWith(fromServices)) {
    return posix.slice(fromServices.length).replace(/^\//, "");
  }
  // Auch Pfadpräfixe früherer Verzeichnisstrukturen unterstützen.
  for (const prefix of ["../../assets/", "../assets/"] as const) {
    if (lower.startsWith(prefix)) {
      return posix.slice(prefix.length).replace(/^\//, "");
    }
  }
  const needle = "/src/assets/";
  const idx = lower.indexOf(needle);
  if (idx >= 0) {
    return posix.slice(idx + needle.length).replace(/^\//, "");
  }
  return posix.replace(/^\.\.\/(?:\.\.\/)*assets\//i, "").replace(/^\//, "");
}

function joinPosix(...parts: string[]): string {
  return parts
    .flatMap((p) => p.split("/"))
    .filter(Boolean)
    .join("/");
}

/**
 * Liefert die Vite-Asset-URL für eine Datei unter `src/assets/<levelFolder>/`.
 */
export function resolveSmartwaterLevelAssetUrl(
  urlMap: Map<string, string>,
  levelFolder: string,
  file: string,
): string {
  const trimmed = String(file ?? "")
    .trim()
    .replace(/^\/+/, "");
  if (!trimmed) {
    throw new Error("resolveSmartwaterLevelAssetUrl: empty file path");
  }
  const primary = joinPosix(levelFolder, trimmed);
  const direct = urlMap.get(primary);
  if (direct) return direct;

  const suffixes = [...urlMap.keys()].filter(
    (k) => k === trimmed || k.endsWith(`/${trimmed}`),
  );
  if (suffixes.length === 1) return urlMap.get(suffixes[0])!;

  const hint =
    suffixes.length === 0
      ? `No match for "${primary}" (or suffix "${trimmed}"). Known keys sample: ${previewKeys(urlMap)}`
      : `Ambiguous file "${trimmed}" — matches: ${suffixes.slice(0, 8).join(", ")}`;
  throw new Error(`resolveSmartwaterLevelAssetUrl: ${hint}`);
}

/** Wie {@link resolveSmartwaterLevelAssetUrl}, ohne Exception bei fehlender Datei. */
export function tryResolveSmartwaterLevelAssetUrl(
  urlMap: Map<string, string>,
  levelFolder: string,
  file: string,
): string | null {
  const trimmed = String(file ?? "")
    .trim()
    .replace(/^\/+/, "");
  if (!trimmed) {
    return null;
  }
  try {
    return resolveSmartwaterLevelAssetUrl(urlMap, levelFolder, trimmed);
  } catch {
    return null;
  }
}

function previewKeys(urlMap: Map<string, string>): string {
  const keys = [...urlMap.keys()];
  return keys.length
    ? keys.slice(0, 12).join(", ") + (keys.length > 12 ? ", …" : "")
    : "(none — Medien unter src/assets?)";
}
