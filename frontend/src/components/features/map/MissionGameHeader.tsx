import type { ReactNode, RefObject } from "react";
import {
  mapGameHeaderMascotVariant,
  type LevelMascotVariant,
} from "@/features/level/schwammMascot";
import { MapGameHeaderView } from "./MapGameHeaderView";

type Props = {
  districtName: string;
  missionLabel: string;
  mascotVariant: LevelMascotVariant | null;
  score: number;
  maxScore: number;
  trailing?: ReactNode;
  placement?: "fixed" | "static";
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

export function MissionGameHeader({
  districtName,
  missionLabel,
  mascotVariant,
  score,
  maxScore,
  trailing,
  placement,
  progressBarRef,
  missionProgressRowRef,
  headerSpongeRef,
  suppressScoreParticles,
  minimumScorePercentage,
  showMaxScoreCrown,
  showMascotCrown,
  mascotEnter,
  scoreGainLabel,
}: Props) {
  const schwammVariant = mapGameHeaderMascotVariant(mascotVariant);

  return (
    <MapGameHeaderView
      districtName={districtName}
      missionLabel={missionLabel}
      mascotVariant={schwammVariant}
      score={score}
      maxScore={maxScore}
      trailing={trailing}
      placement={placement}
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
