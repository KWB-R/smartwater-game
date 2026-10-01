/**
 * Erkennung von WebM mit Alpha-Kanal (Canvas-Compositing-Test).
 * Port der Logik aus DetectWebMAlphaSupport (MIT):
 * https://github.com/logiclrd/DetectWebMAlphaSupport
 */

const TEST_WEBM_DATA_URL =
  "data:video/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQJChYECGFOAZwEAAAAAAAIREU2bdLpNu4tTq4QVSalmU6yBoU27i1OrhBZUrmtTrIHYTbuMU6uEElTDZ1OsggEpTbuMU6uEHFO7a1OsggH77AEAAAAAAABZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVSalmsirXsYMPQkBNgI1MYXZmNjAuMTYuMTAwV0GNTGF2ZjYwLjE2LjEwMESJiEBEAAAAAAAAFlSua8yuAQAAAAAAAEPXgQFzxYgVQM9yjABNrpyBACK1nIN1bmSIgQCGhVZfVlA5g4EBI+ODhAJiWgDglLCBQLqBQJqBAlPAgQFVsIRVuYEBElTDZ0CAc3OgY8CAZ8iaRaOHRU5DT0RFUkSHjUxhdmY2MC4xNi4xMDBzc9pjwItjxYgVQM9yjABNrmfIpUWjh0VOQ09ERVJEh5hMYXZjNjAuMzEuMTAyIGxpYnZweC12cDlnyKFFo4hEVVJBVElPTkSHkzAwOjAwOjAwLjA0MDAwMDAwMAAfQ7Z1x+eBAKDCoZ+BAAAAgkmDQgAD8AP2ADgkHBhKAAAwYAAAE7gYAAAAdaGeppzugQGll4JJg0IAA/AD9gA4JBwYSgAAMGAAAE+AHFO7a5G7j7OBALeK94EB8YIBr/CBAw==";

const DETECT_WEBM_ALPHA_TIMEOUT_MS = 2_500;

type SampleVerdict = "supported" | "unsupported" | "inconclusive";

function verdictFromBlend(blendResult: number): SampleVerdict {
  // Korrektes Alpha-Blend (~191); Safari ohne Alpha oft ~128–139.
  if (blendResult > 180 && blendResult < 200) {
    return "supported";
  }
  if (blendResult >= 115 && blendResult <= 150) {
    return "unsupported";
  }
  // ~255: drawImage hatte noch keinen Effekt; 0: Legacy-IE-Dummy → erneut versuchen.
  return "inconclusive";
}

function waitForPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

/** Canvas-Blit von WebM-Alpha: klar ja / klar nein / unklar (Timeout, Fehler, kein Frame). */
export type WebmAlphaDetectResult = "supported" | "unsupported" | "unknown";

/**
 * Prüft, ob drawImage den WebM-Alpha-Kanal korrekt verarbeitet.
 * Fehler, Zeitüberschreitungen und unklare Ergebnisse liefern unknown.
 */
export function detectWebmAlphaSupport(): Promise<WebmAlphaDetectResult> {
  if (typeof document === "undefined") {
    return Promise.resolve("unknown");
  }
  if (!document.body) {
    return Promise.resolve("unknown");
  }

  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "true");
    video.preload = "auto";
    video.autoplay = false;
    video.loop = false;
    // Firefox dekodiert oft keine Frames in 1–2px-Elementen.
    video.style.cssText =
      "position:fixed;left:0;top:0;width:16px;height:16px;opacity:0.01;pointer-events:none;";

    let settled = false;
    let attempts = 0;
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;
    const maxAttempts = 3;

    const finish = (result: WebmAlphaDetectResult) => {
      if (settled) return;
      settled = true;
      if (timeoutId) {
        globalThis.clearTimeout(timeoutId);
      }
      try {
        void video.pause();
        video.removeAttribute("src");
        void video.load();
        video.remove();
      } catch {
        /* Eine noch nicht verfügbare Bildposition verhindert die weitere Erkennung nicht. */
      }
      resolve(result);
    };

    const sampleFrame = async (): Promise<SampleVerdict> => {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        return "inconclusive";
      }
      context.fillStyle = "white";
      context.fillRect(0, 0, 64, 64);
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        return "inconclusive";
      }
      context.drawImage(video, 0, 0, 64, 64);
      const topLeftPixel = context.getImageData(2, 2, 1, 1);
      return verdictFromBlend(topLeftPixel.data[0] ?? 0);
    };

    const runAttempt = async () => {
      attempts += 1;
      try {
        await waitForPaint();
        const verdict = await sampleFrame();
        if (verdict === "supported") {
          finish("supported");
          return;
        }
        if (verdict === "unsupported") {
          finish("unsupported");
          return;
        }
        if (attempts < maxAttempts) {
          try {
            video.currentTime = 0;
          } catch {
            /* Ein nicht verfügbares Bildsignal beendet die Erkennung über den Ersatzpfad. */
          }
          void video.play().catch(() => {});
          void runAttempt();
          return;
        }
        finish("unknown");
      } catch {
        finish("unknown");
      }
    };

    let decodeStarted = false;
    const onReady = () => {
      if (decodeStarted) return;
      decodeStarted = true;
      void video.play().catch(() => {});
      void runAttempt();
    };

    video.addEventListener("canplay", onReady, { once: true });
    video.addEventListener("error", () => finish("unknown"), { once: true });
    timeoutId = globalThis.setTimeout(
      () => finish("unknown"),
      DETECT_WEBM_ALPHA_TIMEOUT_MS,
    );

    const source = document.createElement("source");
    source.type = "video/webm";
    source.src = TEST_WEBM_DATA_URL;
    video.appendChild(source);
    document.body.appendChild(video);
    void video.load();
  });
}
