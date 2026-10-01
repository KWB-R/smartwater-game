import { LevelPlaySessionProvider } from "@/components/features/level/session/LevelPlaySessionProvider";
import type { LevelPlayPhase } from "@/routes/level/navigation/levelPlayPhase";

type LevelPlacingPageProps = {
  playPhase: LevelPlayPhase;
};

/**
 * Bindet die Spielphase in die Route ein.
 * LevelPlaySessionProvider koordiniert Brett, Punkte, Medien, Overlays und Spieloberfläche.
 */
export function LevelPlacingPage({ playPhase }: LevelPlacingPageProps) {
  return <LevelPlaySessionProvider playPhase={playPhase} />;
}
