import { logError } from "@/lib/logError";
import {
  DEFAULT_DOCUMENT_TITLE,
  SHARE_CONTENT_LINK_PLACEHOLDER,
} from "@/lib/siteDefaults";

export type SharePlatformId =
  | "snapchat"
  | "facebook"
  | "tiktok"
  | "instagram"
  | "youtube"
  | "linkedin";

export type ShareLevelOptions = {
  /** URL der Seite oder des Videos zum Teilen. */
  pageUrl?: string;
  /** Titel aus den CMS-Einstellungen für Teilen und Linkvorschau. */
  title?: string | null;
  /** Vorausgefüllter Text zum Teilen aus shareContent. */
  text?: string | null;
  /** CMS-Levelname für den sichtbaren Dateinamen. */
  levelName?: string | null;
  /** Fertiges Kombivideo im Format combo__*.mp4. */
  videoUrl?: string | null;
  /** Fertiges Kombibild im Format combo__*.webp. */
  imageUrl?: string | null;
  /** Ersatzbild aus shareFallbackImage, falls das Kombibild nicht geladen werden kann. */
  fallbackImageUrl?: string | null;
};

const SHARE_PLATFORMS: ReadonlyArray<{
  id: SharePlatformId;
  label: string;
}> = [
  { id: "snapchat", label: "Snapchat" },
  { id: "facebook", label: "Facebook" },
  { id: "tiktok", label: "TikTok" },
  { id: "instagram", label: "Instagram" },
  { id: "youtube", label: "YouTube" },
  { id: "linkedin", label: "LinkedIn" },
] as const;

export function listSharePlatforms(): typeof SHARE_PLATFORMS {
  return SHARE_PLATFORMS;
}

const SHARE_TEXT =
  "Teile das Video und zeige, wie viel Schwammstadt in Berlin stecken kann!";

function resolveShareTitle(title?: string | null): string {
  return title?.trim() || DEFAULT_DOCUMENT_TITLE;
}

/** Exportiert die Auflösung des CMS-Linkplatzhalters zur absoluten Startseiten-URL. */

/** Dateicache je URL; null kennzeichnet einen fehlgeschlagenen Abruf. */
const shareFileCache = new Map<string, File | null>();
const shareFileInflight = new Map<string, Promise<File | null>>();

function resolveShareUrl(pageUrl?: string): string {
  const trimmed = pageUrl?.trim();
  if (trimmed) {
    try {
      const absolute =
        typeof window !== "undefined"
          ? new URL(trimmed, window.location.origin)
          : new URL(trimmed);
      // Links zur App als Seitenlink behalten. Eine Medien-URL von einer anderen Origin
      // eignet sich nicht als Seitenvorschau für LinkedIn oder Facebook.

      if (
        typeof window === "undefined" ||
        absolute.origin === window.location.origin
      ) {
        return absolute.href;
      }
    } catch {
      // Ungültige URLs über den vorgesehenen Ersatzpfad behandeln.
    }
  }
  // Als Ersatz die aktuelle Teilen-Seite einschließlich combo-Parameter verwenden.
  return resolveCurrentPageUrl();
}

/** Absolute URL der aktuellen App-Seite; SSR → `/`. */
function resolveCurrentPageUrl(): string {
  if (typeof window === "undefined") {
    return "/";
  }
  return window.location.href;
}

/** Absolute URL der App-Startseite (`/`). */
function resolveAppStartPageUrl(): string {
  if (typeof window === "undefined") {
    return "/";
  }
  return `${window.location.origin}/`;
}

/** Ersetzt `[[LINK]]` durch die Startseiten-URL. */
function applyShareContentLinkPlaceholder(text: string): string {
  if (!text.includes(SHARE_CONTENT_LINK_PLACEHOLDER)) {
    return text;
  }
  return text
    .split(SHARE_CONTENT_LINK_PLACEHOLDER)
    .join(resolveAppStartPageUrl());
}

function resolveShareText(text?: string | null): string {
  const trimmed = text?.trim();
  const base = trimmed || SHARE_TEXT;
  return applyShareContentLinkPlaceholder(base);
}

function extensionFromMime(mime: string): string {
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("gif")) return "gif";
  return "webp";
}

function filenameFromUrl(url: string, mime: string): string {
  try {
    const absolute =
      typeof window !== "undefined"
        ? new URL(url, window.location.origin)
        : new URL(url);
    const base = absolute.pathname.split("/").pop();
    if (base && /\.\w+$/.test(base)) {
      return decodeURIComponent(base);
    }
  } catch {
    // Ungültige URLs über den vorgesehenen Ersatzpfad behandeln.
  }
  return `schwammstadt.${extensionFromMime(mime)}`;
}

function shareFileName(file: File, levelName?: string | null): string {
  const slug = levelName
    ?.trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) {
    return file.name;
  }
  return `schwammtastische-vision-${slug}.${extensionFromMime(file.type)}`;
}

/** Lädt Bild-URL als File; bei Fehler `null`. */
export async function fetchShareImageFile(
  imageUrl: string,
): Promise<File | null> {
  return fetchShareFile(imageUrl, "image");
}

async function fetchShareFile(
  url: string,
  mediaType: "image" | "video",
): Promise<File | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    const blob = await response.blob();
    if (blob.size === 0) {
      return null;
    }
    const expectedPrefix = `${mediaType}/`;
    const fallbackMime = mediaType === "video" ? "video/mp4" : "image/webp";
    const mime = blob.type.startsWith(expectedPrefix) ? blob.type : fallbackMime;
    return new File([blob], filenameFromUrl(url, mime), { type: mime });
  } catch (error) {
    logError(`shareLevelVideo:fetch${mediaType}`, error);
    return null;
  }
}

async function fetchShareFileCached(
  url: string,
  mediaType: "image" | "video",
): Promise<File | null> {
  if (shareFileCache.has(url)) {
    return shareFileCache.get(url) ?? null;
  }
  const inflight = shareFileInflight.get(url);
  if (inflight) {
    return inflight;
  }
  const promise = fetchShareFile(url, mediaType).then((file) => {
    shareFileCache.set(url, file);
    shareFileInflight.delete(url);
    return file;
  });
  shareFileInflight.set(url, promise);
  return promise;
}

/**
 * Lädt zunächst das fertige Bild und bei einem Fehler das Ersatzbild.
 */
export async function resolveShareImageFile(
  imageUrl?: string | null,
  fallbackImageUrl?: string | null,
): Promise<File | null> {
  const primary = imageUrl?.trim() || null;
  const fallback = fallbackImageUrl?.trim() || null;
  const urls = [primary, fallback].filter(
    (url, index, all): url is string =>
      Boolean(url) && all.indexOf(url) === index,
  );

  for (const url of urls) {
    const file = await fetchShareFileCached(url, "image");
    if (file) {
      return file;
    }
  }
  return null;
}

/**
 * Das Bild vor dem Klick laden.
 * Warten im Klickhandler würde die direkte Nutzeraktion für Freigabe oder Popup verlieren.
 */
export function primeShareImageFile(
  imageUrl?: string | null,
  fallbackImageUrl?: string | null,
): void {
  void resolveShareImageFile(imageUrl, fallbackImageUrl);
}

/** Lädt das Video vor, damit das Teilen unmittelbar beim Klick möglich ist. */
export function primeShareVideoFile(videoUrl?: string | null): void {
  void resolveShareVideoFile(videoUrl);
}

export async function resolveShareVideoFile(
  videoUrl?: string | null,
): Promise<File | null> {
  const url = videoUrl?.trim();
  return url ? fetchShareFileCached(url, "video") : null;
}

/** Liefert nur bereits gecachte Dateien ohne Netzwerkzugriff im Klickhandler. */
export function peekShareImageFile(
  imageUrl?: string | null,
  fallbackImageUrl?: string | null,
): File | null {
  const primary = imageUrl?.trim() || null;
  const fallback = fallbackImageUrl?.trim() || null;
  const urls = [primary, fallback].filter(
    (url, index, all): url is string =>
      Boolean(url) && all.indexOf(url) === index,
  );

  for (const url of urls) {
    const cached = shareFileCache.get(url);
    if (cached) {
      return cached;
    }
  }
  return null;
}

/** Liefert das Video synchron aus dem Cache. */
function peekShareVideoFile(videoUrl?: string | null): File | null {
  const url = videoUrl?.trim();
  return url ? (shareFileCache.get(url) ?? null) : null;
}

/** Leert den Dateicache für Tests. */
export function clearShareFileCache(): void {
  shareFileCache.clear();
  shareFileInflight.clear();
}

function buildShareData(
  title: string,
  text: string,
  url: string,
  files: ReadonlyArray<File>,
  levelName?: string | null,
): ShareData {
  const data: ShareData = { title, text, url };
  const file = files.find((candidate) => canShareData({ files: [candidate] }));
  if (file) {
    data.files = [
      new File([file], shareFileName(file, levelName), { type: file.type }),
    ];
  }
  return data;
}

function canShareData(data: ShareData): boolean {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.canShare !== "function"
  ) {
    // Ohne canShare nur Text und URL freigeben; keine Dateiunterstützung voraussetzen.
    return !data.files?.length;
  }
  try {
    return navigator.canShare(data);
  } catch {
    return false;
  }
}

/**
 * Verwendet einen share()-Aufruf ohne erneuten Versuch nach einem Fehler.
 * Mobile Browser verbrauchen dabei die direkte Nutzeraktion.
 * Bei Dateien url weglassen, da diese Kombination auf iOS und Android fehlschlagen kann.
 */
function pickNativeShareData(data: ShareData): ShareData {
  const files = data.files;
  if (files && files.length > 0 && canShareData({ files })) {
    return {
      files,
      title: data.title,
      text: data.text,
    };
  }
  return {
    title: data.title,
    text: data.text,
    url: data.url,
  };
}

async function tryNativeShare(data: ShareData): Promise<boolean> {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.share !== "function"
  ) {
    return false;
  }

  const payload = pickNativeShareData(data);
  try {
    await navigator.share(payload);
    return true;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return true;
    }
    logError("shareLevelVideo:nativeShare", err);
    return false;
  }
}

/**
 * Text zum Kopieren einschließlich Link, falls der CMS-Text keinen enthält.
 * Plattformen, die den Freigabetext ignorieren, benötigen das Einfügen aus der Zwischenablage.
 */
export function resolveShareClipboardText(text: string, url: string): string {
  const trimmedUrl = url.trim();
  if (!trimmedUrl || text.includes(trimmedUrl)) {
    return text;
  }
  return `${text}\n${trimmedUrl}`;
}

async function copyShareTextToClipboard(
  text: string,
  url: string,
): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return;
  }
  try {
    await navigator.clipboard.writeText(resolveShareClipboardText(text, url));
  } catch (error) {
    logError("shareLevelVideo:clipboard", error);
  }
}

/**
 * Bereitet die Freigabe synchron aus gecachten Dateien vor.
 * Zusätzliche Dateien werden parallel für einen späteren Klick geladen.
 */
function prepareSharePayloadSync(options: ShareLevelOptions = {}): {
  url: string;
  text: string;
  files: File[];
} {
  const url = resolveShareUrl(options.pageUrl);
  const text = resolveShareText(options.text);
  // Fehlende Dateien parallel nachladen, damit sie beim nächsten Klick bereitliegen.
  primeShareVideoFile(options.videoUrl);
  primeShareImageFile(options.imageUrl, options.fallbackImageUrl);
  const files = [
    peekShareVideoFile(options.videoUrl),
    peekShareImageFile(options.imageUrl, options.fallbackImageUrl),
  ].filter((file): file is File => file != null);
  return { url, text, files };
}

/** Öffnet den nativen Teilen-Dialog und kopiert den Text zusätzlich in die Zwischenablage. */
export async function shareLevelNative(
  options: ShareLevelOptions | string = {},
): Promise<void> {
  // Unterstützt auch die frühere Signatur mit einer einzelnen URL.
  const opts: ShareLevelOptions =
    typeof options === "string" ? { pageUrl: options } : options;

  const { url, text, files } = prepareSharePayloadSync(opts);
  const data = buildShareData(
    resolveShareTitle(opts.title),
    text,
    url,
    files,
    opts.levelName,
  );

  // Den Text vor share() kopieren, solange die direkte Nutzeraktion den Zugriff erlaubt.
  void copyShareTextToClipboard(text, url);

  if (await tryNativeShare(data)) {
    return;
  }

  await copyShareTextToClipboard(text, url);
}

function platformShareUrl(
  platform: SharePlatformId,
  pageUrl: string,
  text: string,
): string | null {
  const encoded = encodeURIComponent(pageUrl);
  const encodedText = encodeURIComponent(text);
  switch (platform) {
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${encoded}&quote=${encodedText}`;
    case "linkedin":
      // LinkedIn übernimmt nur die URL; den Text über die Zwischenablage bereitstellen.
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`;
    case "tiktok":
      return null;
    case "instagram":
      return null;
    case "snapchat":
      return null;
    case "youtube":
      return null;
    default: {
      const _exhaustive: never = platform;
      return _exhaustive;
    }
  }
}

export async function shareLevelViaPlatform(
  platform: SharePlatformId,
  options: ShareLevelOptions | string = {},
): Promise<void> {
  const opts: ShareLevelOptions =
    typeof options === "string" ? { pageUrl: options } : options;

  const { url, text, files } = prepareSharePayloadSync(opts);
  const data = buildShareData(
    resolveShareTitle(opts.title),
    text,
    url,
    files,
    opts.levelName,
  );
  const hasNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  // Den Text zusätzlich kopieren, damit er bei Bedarf in der Ziel-App eingefügt werden kann.
  void copyShareTextToClipboard(text, url);

  // Wenn verfügbar die native Freigabe verwenden; sonst das Popup unmittelbar beim Klick öffnen.
  if (hasNativeShare) {
    void tryNativeShare(data);
    return;
  }

  const external = platformShareUrl(platform, url, text);
  if (external) {
    window.open(external, "_blank", "noopener,noreferrer");
    return;
  }

  await copyShareTextToClipboard(text, url);
}
