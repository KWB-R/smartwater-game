import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { MissionGameHeader } from "@/components/features/map/MissionGameHeader";
import { useLevelHeaderSnapshot } from "@/features/level/hooks/useLevelHeaderSnapshot";

type LevelMissionHeaderBarProps = {
  levelKey: string;
  districtName: string;
  missionLabel: string;
  score: number;
  maxScore: number;
  progressBarRef?: RefObject<HTMLDivElement | null>;
  missionProgressRowRef?: RefObject<HTMLDivElement | null>;
  headerSpongeRef?: RefObject<HTMLButtonElement | null>;
  suppressScoreParticles?: boolean;
  minimumScorePercentage?: number | null;
  showMaxScoreCrown?: boolean;
  showMascotCrown?: boolean;
  mascotEnter?: boolean;
  scoreGainLabel?: string | null;
};

export function LevelMissionHeaderBar({
  levelKey,
  districtName,
  missionLabel,
  score,
  maxScore,
  progressBarRef,
  missionProgressRowRef,
  headerSpongeRef,
  suppressScoreParticles,
  minimumScorePercentage,
  showMaxScoreCrown,
  showMascotCrown,
  mascotEnter: mascotEnterProp,
  scoreGainLabel,
}: LevelMissionHeaderBarProps) {
  const levelHeaderSnapshot = useLevelHeaderSnapshot(levelKey);
  const enterTriggeredRef = useRef(false);
  const [mascotEnter, setMascotEnter] = useState(mascotEnterProp ?? false);

  useEffect(() => {
    if (mascotEnterProp === true) {
      setMascotEnter(true);
      return;
    }
    if (enterTriggeredRef.current || !levelHeaderSnapshot) {
      return;
    }
    if (
      !levelHeaderSnapshot.hasPlayed &&
      levelHeaderSnapshot.mascotVariant === "levelentry"
    ) {
      enterTriggeredRef.current = true;
      setMascotEnter(true);
    }
  }, [levelHeaderSnapshot, mascotEnterProp]);
  const barMax = Math.max(1, Math.round(maxScore));

  return (
    <MissionGameHeader
      districtName={districtName}
      missionLabel={missionLabel}
      mascotVariant={levelHeaderSnapshot?.mascotVariant ?? null}
      score={score}
      maxScore={barMax}
      placement="static"
      progressBarRef={progressBarRef}
      missionProgressRowRef={missionProgressRowRef}
      headerSpongeRef={headerSpongeRef}
      suppressScoreParticles={suppressScoreParticles}
      minimumScorePercentage={minimumScorePercentage}
      showMaxScoreCrown={showMaxScoreCrown}
      showMascotCrown={showMascotCrown}
      mascotEnter={mascotEnter}
      scoreGainLabel={scoreGainLabel}
    />
  );
}
