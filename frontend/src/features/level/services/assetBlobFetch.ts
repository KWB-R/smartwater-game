import { putOfflineMediaCache } from "@/pwa/offlineMediaCache";

/** Vite-Ausgabe / Dev-Server: hier reicht ein Bild-Ladepfad ohne vorherigen `fetch`+Blob (weniger SW-Konflikte). */
export function shouldLoadImageDirectly(url: string): boolean {
  const s = String(url ?? "").trim();
  if (!s) return false;
  try {
    const abs = /^https?:\/\//i.test(s)
      ? new URL(s)
      : new URL(s, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    const p = abs.pathname;
    return (
      p.includes("/assets/") ||
      p.startsWith("/@fs/") ||
      p.startsWith("/@id/") ||
      /\/src\/.*\.(png|jpe?g|webp|gif|svg)$/i.test(p)
    );
  } catch {
    return false;
  }
}

/** Lädt eine Asset-URL als Blob mit Byte-Fortschritt und schreibt sie in den Offline-Media-Cache. */
export async function fetchAssetBlobWithProgress(
  url: string,
  onProgress: (p: number, indeterminate: boolean) => void,
  signal: AbortSignal,
): Promise<Blob> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  // Cache und Fortschrittsanzeige parallel lesen; auf den Cache nicht vor dem Lesen der Daten warten.
  void putOfflineMediaCache(url, res.clone()).catch(() => {});
  const totalHeader = res.headers.get("content-length");
  const total = totalHeader ? parseInt(totalHeader, 10) : 0;
  const body = res.body;
  if (!body) {
    const b = await res.blob();
    onProgress(1, false);
    return b;
  }
  if (!total || total <= 0) {
    onProgress(0, true);
    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    onProgress(1, false);
    return new Blob(chunks as BlobPart[]);
  }
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.length;
      onProgress(Math.min(1, received / total), false);
    }
  }
  onProgress(1, false);
  return new Blob(chunks as BlobPart[]);
}
