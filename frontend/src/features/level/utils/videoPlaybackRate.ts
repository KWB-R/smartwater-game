const MIN_PLAYBACK_RATE = 0.25;
const MAX_PLAYBACK_RATE = 4;

/** Akzeptiert nur positive, endliche Werte für playbackRate aus der Levelkonfiguration. */
export function normalizeConfigPlaybackRate(
  value: number | undefined,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return Math.min(MAX_PLAYBACK_RATE, Math.max(MIN_PLAYBACK_RATE, value));
}

/** Setzt die konfigurierte Wiedergabegeschwindigkeit; ohne Wert bleibt der Browserstandard erhalten. */
export function applyOptionalVideoPlaybackRate(
  video: HTMLVideoElement,
  rate: number | undefined,
): void {
  const normalized = normalizeConfigPlaybackRate(rate);
  if (normalized === undefined) {
    return;
  }
  video.playbackRate = normalized;
  video.defaultPlaybackRate = normalized;
}
