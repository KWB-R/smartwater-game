/** Konfetti-Burst auf der Karte. */
export const MAP_POST_LEVEL_MAP_CONFETTI_PARTICLE_COUNT = 40;

/**
 * Ab diesem Zeitpunkt keine neuen Konfettipartikel starten.
 * Bereits gestartete Partikel fallen zu Ende.
 */
export const MAP_POST_LEVEL_MAP_CONFETTI_STOP_SPAWN_MS = 1_400;

/**
 * Maximale Falldauer eines Partikels; den Konfettieffekt erst danach entfernen.
 */
export const MAP_POST_LEVEL_MAP_CONFETTI_MAX_FALL_MS = 3_000;

/** Verzögerung der Bezirksfärbung ab dem Schließen des Detail-Sheets. */
export const MAP_POST_LEVEL_MAP_DISTRICT_REVEAL_DELAY_MS = 0;

/** Verzögerung der Aktualisierung von solvedDistricts im Footer. */
export const MAP_POST_LEVEL_MAP_SOLVED_COUNT_DELAY_MS = 2_150;

/** Pause nach Bezirksfärbung oder Zähleraktualisierung vor dem Bonuseffekt. */
export const MAP_POST_LEVEL_MAP_BONUS_AFTER_PRIOR_STEPS_MS = 700;

/** Restdauer des Kartenintros nach dem Bonuseffekt. */
export const MAP_POST_LEVEL_MAP_OPEN_DETAIL_AFTER_BONUS_GAP_MS = 1_200;

/** Dauer des Kartenintros ohne Bonusfreischaltung. */
export const MAP_POST_LEVEL_MAP_OPEN_DETAIL_NO_BONUS_MS = 3_450;

/** Verzögerung der Krone nach der Sternanimation im Detail. */
export const MAP_POST_LEVEL_DETAIL_CROWN_REVEAL_DELAY_MS = 280;
