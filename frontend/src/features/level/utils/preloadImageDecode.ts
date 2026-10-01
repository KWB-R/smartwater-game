import { resolveOfflineMediaPlaybackUrl } from "@/pwa/resolveOfflineMediaPlaybackUrl";

/** Lädt ein Bild und wartet auf die Dekodierung für Szene und Vorschau. */
export async function preloadImageDecode(src: string): Promise<void> {
  const resolved = await resolveOfflineMediaPlaybackUrl(src);
  return new Promise((resolve, reject) => {
    const img = new Image();
    try {
      if (resolved.startsWith("blob:")) {
        /* Blob-URLs benötigen kein crossOrigin. */
      } else {
        const u = new URL(
          resolved,
          typeof window !== "undefined"
            ? window.location.href
            : "http://localhost/",
        );
        if (
          typeof window !== "undefined" &&
          u.origin === window.location.origin
        ) {
          /* Bei gleicher Origin crossOrigin weglassen. */
        } else {
          img.crossOrigin = "anonymous";
        }
      }
    } catch {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => {
      void img.decode().then(resolve).catch(() => resolve());
    };
    img.onerror = () => reject(new Error("img"));
    img.src = resolved;
  });
}
