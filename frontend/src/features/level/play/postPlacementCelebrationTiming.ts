import type { PlacementScoreSteps } from "@/features/level/logic/placementRewardSteps";

const TILE_EXPLOSION_MS = 520;
const BAR_FLIGHT_MS = 900;
const BAR_FLIGHT_RELAXED_MS = 1180;

function postPlacementBarParticleLegCount(
  steps: PlacementScoreSteps,
): number {
  // Missions- und Bonus-Partikel starten gemeinsam → eine Flugdauer.
  return steps.baseDelta > 0 || steps.focusExtraDelta > 0 ? 1 : 0;
}

/** Ersatzzeit, falls der Partikeleffekt keinen Abschluss meldet, etwa nach erneutem Einbinden. */
export function postPlacementCelebrationFallbackMs(options: {
  reducedMotion: boolean;
  steps: PlacementScoreSteps;
  relaxedFlight?: boolean;
}): number {
  if (options.reducedMotion) {
    return 200;
  }
  const legMs = options.relaxedFlight ? BAR_FLIGHT_RELAXED_MS : BAR_FLIGHT_MS;
  const legs = postPlacementBarParticleLegCount(options.steps);
  return TILE_EXPLOSION_MS + legs * legMs + 160;
}
