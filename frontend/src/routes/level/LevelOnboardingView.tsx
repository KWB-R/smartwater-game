import { useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";
import { ROUTES } from "@/routes/paths";
import { ButtonLink } from "@/components/ui/Button";
import { isLevelIntroLocationState } from "@/routes/level/navigation/levelIntroTypes";
import { useLevelRouteSummary } from "@/features/level/hooks/useLevelRouteSummary";
import { useLevelSessionChrome } from "@/components/features/level/session/levelSessionChromeContext";
import {
  LEVEL_PLAY_PHASE,
  type LevelPlayPhase,
} from "@/routes/level/navigation/levelPlayPhase";
import { useLevelMissionPhase } from "@/components/features/level/phases/useLevelMissionPhase";

type LevelOnboardingViewProps = {
  phase: LevelPlayPhase;
};

export function LevelOnboardingView({ phase }: LevelOnboardingViewProps) {
  const { levelId } = useParams();
  const location = useLocation();
  const introState = useMemo(() => {
    const state = location.state;
    return isLevelIntroLocationState(state) ? state : null;
  }, [location.state]);
  const { level: resolvedLevel } = useLevelRouteSummary(levelId, introState);
  const level = resolvedLevel ?? introState?.level ?? null;

  const missionPhase = useLevelMissionPhase({
    enabled:
      phase === LEVEL_PLAY_PHASE.mission && introState != null && level != null,
    state: introState,
    levelId: levelId ?? "",
    level,
  });

  useLevelSessionChrome(
    missionPhase.chromePatch ?? { topBar: null },
    missionPhase.chromeSyncKey ?? phase,
  );

  if (phase === LEVEL_PLAY_PHASE.mission) {
    if (!introState || !levelId || !level) {
      return <OnboardingFallback />;
    }
    return null;
  }

  return null;
}

function OnboardingFallback() {
  return (
    <div className="flex min-h-full flex-col bg-swg-bg p-8 px-4 text-center justify-center items-center">
      <p className="text-2xl font-medium leading-tight text-swg-black mb-8">
        Ein Fehler ist aufgetreten. <br />
        Bitte versuche es erneut.
      </p>
      <ButtonLink to={ROUTES.map}>Zurück zur Karte</ButtonLink>
    </div>
  );
}
