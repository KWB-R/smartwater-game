/**
 * Zentrales Register der Browserspeicherschlüssel.
 * Bestehende Schlüssel beibehalten, damit Spielstände erhalten bleiben.
 * Neue Versionen erhalten ein Suffix und eine Migration im zuständigen Modul.
 */
export const STORAGE_KEYS = {
  /** localStorage, pro Level (`prefix + levelKey`). */
  levelProgressPrefix: "swg-level-progress:",
  /** localStorage, pro Level. */
  levelGallerySnapshotPrefix: "swg-level-gallery:",
  /** localStorage, pro Bezirk. */
  mapBonusRevealedPrefix: "swg-map-bonus-revealed:",
  /** localStorage. */
  levelPlayTutorialCompleted: "swg.levelPlayTutorial.completed.v1",
  /** localStorage für das Alpha-Testergebnis supported, unsupported oder unknown. */
  webmAlphaSupported: "swg-webm-alpha-canvas-v2",
  /** localStorage für den Offline-Erstaufbau der PWA. */
  offlineBootstrapCompleted: "swg_offline_bootstrap_completed",
  offlineLastSyncAt: "swg_offline_last_sync_at",
  offlineBootstrapVersion: "swg_offline_bootstrap_version",
  offlineLastDownloadedBytes: "swg_offline_last_downloaded_bytes",
  /** Absolute Medien-URLs des letzten vollständigen Offline-Abgleichs als JSON-Array. */
  offlineMediaUrlSet: "swg_offline_media_url_set",
  /** Vergleichswert der CMS-Medien-URLs aus Bezirken und Missionskatalog. */
  offlineCmsMediaFingerprint: "swg_offline_cms_media_fingerprint",

  /** sessionStorage, pro Level. */
  levelPlayContextPrefix: "swg-level-play:",
  /** sessionStorage, pro Level. */
  levelPlaySessionPrefix: "swg-level-play-session:",
  /** sessionStorage, pro Level. */
  levelHeaderSnapshotPrefix: "swg-level-header:",
  /** sessionStorage. */
  mapPostLevelCelebration: "swg-map-post-level-celebration",
} as const;
