import { useRef, type MutableRefObject, type RefObject } from "react";
import type { Tile } from "@/features/level/types";
import {
  EMPTY_POST_LEVEL_MAP_SNAPSHOT,
  type PostLevelMapSnapshot,
} from "@/features/level/play/useLevelProgressPersistence";

/**
 * Gemeinsame stabile Refs der Spielsitzung.
 * Alle Ablauf-Hooks derselben Providerinstanz greifen auf dieses Objekt zu.
 */
export type LevelPlayFlowRefs = {
  playAdvancedRef: MutableRefObject<boolean>;
  pendingSocketTilesRef: MutableRefObject<Tile[]>;
  comboRevealTileIdsRef: MutableRefObject<number[]>;
  comboRevealStripBurstStartedRef: MutableRefObject<boolean>;
  comboRevealReservedRef: MutableRefObject<ReadonlySet<number>>;
  comboRevealTimerRef: MutableRefObject<number | null>;
  flashKombiStripRevealRef: MutableRefObject<(tileId: number) => void>;
  preQuizGateOpenTimerRef: MutableRefObject<number | null>;
  replayProgressResetKeyRef: MutableRefObject<string | null>;
  mapReturnFromStarCountRef: MutableRefObject<0 | 1 | 2 | 3>;
  postLevelBestStarsRef: MutableRefObject<1 | 2 | 3>;
  postLevelShouldCelebrateRef: MutableRefObject<boolean>;
  postLevelIsFirstCompletionRef: MutableRefObject<boolean>;
  postLevelMapSnapshotRef: MutableRefObject<PostLevelMapSnapshot>;
  missionBarTrackRef: RefObject<HTMLDivElement | null>;
  missionProgressRowRef: RefObject<HTMLDivElement | null>;
  puzzleCountBadgeRef: RefObject<HTMLSpanElement | null>;
  tileCardsButtonRef: RefObject<HTMLButtonElement | null>;
  headerSpongeRef: RefObject<HTMLButtonElement | null>;
};

export function useLevelPlayFlowRefs(): LevelPlayFlowRefs {
  const playAdvancedRef = useRef(false);
  const pendingSocketTilesRef = useRef<Tile[]>([]);
  const comboRevealTileIdsRef = useRef<number[]>([]);
  const comboRevealStripBurstStartedRef = useRef(false);
  const comboRevealReservedRef = useRef<ReadonlySet<number>>(new Set());
  const comboRevealTimerRef = useRef<number | null>(null);
  const flashKombiStripRevealRef = useRef<(tileId: number) => void>(() => {});
  const preQuizGateOpenTimerRef = useRef<number | null>(null);
  const replayProgressResetKeyRef = useRef<string | null>(null);
  const mapReturnFromStarCountRef = useRef<0 | 1 | 2 | 3>(0);
  const postLevelBestStarsRef = useRef<1 | 2 | 3>(1);
  const postLevelShouldCelebrateRef = useRef(true);
  const postLevelIsFirstCompletionRef = useRef(true);
  const postLevelMapSnapshotRef = useRef<PostLevelMapSnapshot>(
    EMPTY_POST_LEVEL_MAP_SNAPSHOT,
  );
  const missionBarTrackRef = useRef<HTMLDivElement>(null);
  const missionProgressRowRef = useRef<HTMLDivElement>(null);
  const puzzleCountBadgeRef = useRef<HTMLSpanElement>(null);
  const tileCardsButtonRef = useRef<HTMLButtonElement>(null);
  const headerSpongeRef = useRef<HTMLButtonElement>(null);

  const bagRef = useRef<LevelPlayFlowRefs | null>(null);
  if (bagRef.current == null) {
    bagRef.current = {
      playAdvancedRef,
      pendingSocketTilesRef,
      comboRevealTileIdsRef,
      comboRevealStripBurstStartedRef,
      comboRevealReservedRef,
      comboRevealTimerRef,
      flashKombiStripRevealRef,
      preQuizGateOpenTimerRef,
      replayProgressResetKeyRef,
      mapReturnFromStarCountRef,
      postLevelBestStarsRef,
      postLevelShouldCelebrateRef,
      postLevelIsFirstCompletionRef,
      postLevelMapSnapshotRef,
      missionBarTrackRef,
      missionProgressRowRef,
      puzzleCountBadgeRef,
      tileCardsButtonRef,
      headerSpongeRef,
    };
  }
  return bagRef.current;
}
