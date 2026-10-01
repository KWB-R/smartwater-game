import { createContext, type Dispatch, type SetStateAction } from "react";
import type { AppError } from "@/api/errors";
import type { District, DistrictLevelSummary } from "@/types/content";
import type { LevelHeaderSnapshot } from "@/features/level/levelHeaderSnapshot";

export type MapSessionValue = {
  districtId: string | undefined;
  district: District | null;
  detailStatus: "idle" | "loading" | "success" | "error";
  detailError: AppError | undefined;
  selectedLevel: DistrictLevelSummary | null;
  selectedLevelKey: string | null;
  selectLevel: (key: string) => void;
  missionScore: number;
  missionMaxScore: number;
  levelHeaderSnapshot: LevelHeaderSnapshot | null;
  levelStartOpen: boolean;
  openLevelStart: () => void;
  openLevelStartForLevel: (levelKey: string) => void;
  closeLevelStart: () => void;
  closeLevelStartAfterPostLevelCelebration: (options?: {
    bonusUnlockDistrictRouteId?: string;
  }) => void;
  /** Entfernt nach dem Kartenintro den Abschlusszustand auf der Übersicht. */
  finishMapPostLevelMapIntro: () => void;
  closeDistrict: () => void;
  /** Obere Bildschirmposition des Detail-Sheets in Pixeln; null bei geschlossenem Sheet. */
  mapDetailPeekTopPx: number | null;
  setMapDetailPeekTopPx: Dispatch<SetStateAction<number | null>>;
};

export const MapSessionContext = createContext<MapSessionValue | null>(null);
