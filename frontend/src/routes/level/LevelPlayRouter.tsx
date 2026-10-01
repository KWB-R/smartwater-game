import { Navigate, useLocation, useParams } from "react-router-dom";
import { LevelPlacingPage } from "@/routes/level/LevelPage";
import { LevelOnboardingView } from "@/routes/level/LevelOnboardingView";
import { ROUTES } from "@/routes/paths";
import {
  LEVEL_PLAY_PHASE,
  parseLevelPlayPhaseParam,
} from "@/routes/level/navigation/levelPlayPhase";

export default function LevelPlayRouter() {
  const { levelId, phase: phaseParam } = useParams();
  const location = useLocation();
  const playPhase = parseLevelPlayPhaseParam(phaseParam);

  if (playPhase === LEVEL_PLAY_PHASE.intro && levelId) {
    return (
      <Navigate
        to={ROUTES.levelMission(levelId)}
        replace
        state={location.state}
      />
    );
  }

  if (playPhase === LEVEL_PLAY_PHASE.mission) {
    return <LevelOnboardingView phase={playPhase} />;
  }
  // Ein Levelwechsel bindet die Spielsitzung neu ein und setzt ihren Zustand vollständig zurück.

  return <LevelPlacingPage key={levelId ?? ""} playPhase={playPhase} />;
}
