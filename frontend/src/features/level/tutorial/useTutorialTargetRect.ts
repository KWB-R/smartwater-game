import { useCallback, useLayoutEffect, useState, type Dispatch, type SetStateAction } from "react";
import type { RefObject } from "react";
import { useLatestRef } from "@/hooks/useLatestRef";
import type { Tile } from "@/features/level/types";
import type {
  LevelPlayTutorialPointerAnchorId,
  LevelPlayTutorialRect,
  LevelPlayTutorialStepConfig,
  LevelPlayTutorialTargetId,
} from "@/features/level/tutorial/types";
export type TutorialTargetRefs = {
  missionProgressRowRef: RefObject<HTMLElement | null>;
  puzzleCountBadgeRef: RefObject<HTMLElement | null>;
  tileCardsButtonRef: RefObject<HTMLElement | null>;
  headerSpongeRef: RefObject<HTMLElement | null>;
  gameBoardRef: RefObject<HTMLElement | null>;
};

export type TutorialMeasuredTargets = {
  highlightRect: LevelPlayTutorialRect | null;
  speechBubbleAnchorRect: LevelPlayTutorialRect | null;
  pointerAnchorRect: LevelPlayTutorialRect | null;
  undimRects: LevelPlayTutorialRect[];
  secondaryHighlightRects: LevelPlayTutorialRect[];
  /** Sichtbarer Innenbereich der Bibliothek für Hervorhebungen. */
  highlightClipRect: LevelPlayTutorialRect | null;
};

function resolveTileLibraryElement(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".level-tile-dock");
}

function resolveTileDockInnerElement(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".level-tile-dock-inner");
}

function resolveTileLibraryStripElement(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".level-tile-strip");
}

function tutorialStepUsesLibraryHighlightClip(
  step: LevelPlayTutorialStepConfig,
): boolean {
  return (
    step.target === "puzzlePiece" ||
    step.target === "tileLibrary" ||
    step.highlightAllLibraryPieces === true
  );
}

function measureElement(el: HTMLElement | null): LevelPlayTutorialRect | null {
  if (!el) {
    return null;
  }
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

function measureAllLibraryPieceRects(
  stripTiles: ReadonlyArray<Tile>,
): LevelPlayTutorialRect[] {
  const rects: LevelPlayTutorialRect[] = [];
  for (let index = 0; index < stripTiles.length; index += 1) {
    const rect = measureElement(
      resolvePuzzlePieceElement(stripTiles, index),
    );
    if (rect) {
      rects.push(rect);
    }
  }
  return rects;
}

function resolvePuzzlePieceElement(
  stripTiles: ReadonlyArray<Tile>,
  index: number,
): HTMLElement | null {
  const tile = stripTiles[index];
  if (!tile) {
    return null;
  }
  return document.querySelector<HTMLElement>(
    `[data-strip-tile-thumb="${tile.id}"]`,
  );
}

function resolvePointerAnchorRect(
  anchor: LevelPlayTutorialPointerAnchorId | undefined,
  refs: TutorialTargetRefs,
): LevelPlayTutorialRect | null {
  if (!anchor) {
    return null;
  }
  switch (anchor) {
    case "puzzleCountBadge":
      return measureElement(refs.puzzleCountBadgeRef.current);
    default: {
      const _exhaustive: never = anchor;
      return _exhaustive;
    }
  }
}

function resolveTutorialTargetRect(
  target: LevelPlayTutorialTargetId,
  step: LevelPlayTutorialStepConfig,
  refs: TutorialTargetRefs,
  stripTiles: ReadonlyArray<Tile>,
): LevelPlayTutorialRect | null {
  switch (target) {
    case "headerMissionProgress": {
      // Das transformierte Balkenelement messen; das Rechteck der Zeile enthält die Verschiebung des Kindes nicht.
      const row = refs.missionProgressRowRef.current;
      const bar = row?.querySelector<HTMLElement>('[role="progressbar"]');
      return measureElement(bar ?? row);
    }
    case "puzzleCountBadge":
      return measureElement(refs.puzzleCountBadgeRef.current);
    case "tileCardsButton":
      return measureElement(refs.tileCardsButtonRef.current);
    case "headerSponge":
      return measureElement(refs.headerSpongeRef.current);
    case "gameBoard":
      return measureElement(refs.gameBoardRef.current);
    case "puzzlePiece":
      return measureElement(
        resolvePuzzlePieceElement(
          stripTiles,
          step.puzzlePieceIndex ?? 0,
        ),
      );
    case "tileLibrary":
      return measureElement(resolveTileLibraryElement());
    case "tileLibraryStrip":
      return measureElement(resolveTileLibraryStripElement());
    default: {
      const _exhaustive: never = target;
      return _exhaustive;
    }
  }
}

function measureTutorialTargets(
  active: boolean,
  step: LevelPlayTutorialStepConfig | null,
  refs: TutorialTargetRefs,
  stripTiles: ReadonlyArray<Tile>,
): TutorialMeasuredTargets {
  if (!active || !step) {
    return {
      highlightRect: null,
      speechBubbleAnchorRect: null,
      pointerAnchorRect: null,
      undimRects: [],
      secondaryHighlightRects: [],
      highlightClipRect: null,
    };
  }
  const undimRects: LevelPlayTutorialRect[] = [];
  for (const targetId of step.alsoUndimTargets ?? []) {
    const rect = resolveTutorialTargetRect(targetId, step, refs, stripTiles);
    if (rect) {
      undimRects.push(rect);
    }
  }
  const secondaryHighlightRects = [
    ...(step.extraHighlightTargets ?? [])
      .map((targetId) =>
        resolveTutorialTargetRect(targetId, step, refs, stripTiles),
      )
      .filter((rect): rect is LevelPlayTutorialRect => rect != null),
    ...(step.highlightAllLibraryPieces
      ? measureAllLibraryPieceRects(stripTiles)
      : []),
  ];
  const highlightClipRect = tutorialStepUsesLibraryHighlightClip(step)
    ? measureElement(resolveTileDockInnerElement())
    : null;
  return {
    highlightRect: resolveTutorialTargetRect(
      step.target,
      step,
      refs,
      stripTiles,
    ),
    speechBubbleAnchorRect: resolveTutorialTargetRect(
      step.speechBubbleTarget ?? step.target,
      step,
      refs,
      stripTiles,
    ),
    pointerAnchorRect: resolvePointerAnchorRect(step.pointerAnchor, refs),
    undimRects,
    secondaryHighlightRects,
    highlightClipRect,
  };
}

const EMPTY_MEASURED: TutorialMeasuredTargets = {
  highlightRect: null,
  speechBubbleAnchorRect: null,
  pointerAnchorRect: null,
  undimRects: [],
  secondaryHighlightRects: [],
  highlightClipRect: null,
};

function rectEqual(
  a: LevelPlayTutorialRect | null,
  b: LevelPlayTutorialRect | null,
): boolean {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return (
    a.top === b.top &&
    a.left === b.left &&
    a.width === b.width &&
    a.height === b.height
  );
}

function rectsEqual(
  a: LevelPlayTutorialRect[],
  b: LevelPlayTutorialRect[],
): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let index = 0; index < a.length; index += 1) {
    if (!rectEqual(a[index], b[index])) {
      return false;
    }
  }
  return true;
}

function measuredTargetsEqual(
  a: TutorialMeasuredTargets,
  b: TutorialMeasuredTargets,
): boolean {
  return (
    rectEqual(a.highlightRect, b.highlightRect) &&
    rectEqual(a.speechBubbleAnchorRect, b.speechBubbleAnchorRect) &&
    rectEqual(a.pointerAnchorRect, b.pointerAnchorRect) &&
    rectEqual(a.highlightClipRect, b.highlightClipRect) &&
    rectsEqual(a.undimRects, b.undimRects) &&
    rectsEqual(a.secondaryHighlightRects, b.secondaryHighlightRects)
  );
}

function commitMeasured(
  setMeasured: Dispatch<SetStateAction<TutorialMeasuredTargets>>,
  next: TutorialMeasuredTargets,
): void {
  setMeasured((prev) => (measuredTargetsEqual(prev, next) ? prev : next));
}

export function useTutorialTargetRect(
  active: boolean,
  step: LevelPlayTutorialStepConfig | null,
  refs: TutorialTargetRefs,
  stripTiles: ReadonlyArray<Tile>,
): TutorialMeasuredTargets {
  const [measured, setMeasured] = useState<TutorialMeasuredTargets>(
    EMPTY_MEASURED,
  );

  const measureArgsRef = useLatestRef({ active, step, refs, stripTiles });

  const remeasure = useCallback(() => {
    const { active: isActive, step: currentStep, refs: currentRefs, stripTiles: tiles } =
      measureArgsRef.current;
    commitMeasured(
      setMeasured,
      measureTutorialTargets(isActive, currentStep, currentRefs, tiles),
    );
  }, [measureArgsRef]);

  const stripTileIdsKey = stripTiles.map((tile) => tile.id).join(",");

  useLayoutEffect(() => {
    if (!active || !step) {
      // Das letzte Zielrechteck behalten, bis die Bibliothek nach dem Schließen wieder messbar ist.
      // So springt die Sprechblase nicht kurz zum Ersatzanker auf dem Brett.
      return;
    }
    remeasure();
    const onLayout = () => remeasure();
    window.addEventListener("resize", onLayout);
    window.addEventListener("scroll", onLayout, true);
    const ro = new ResizeObserver(onLayout);
    const observe = (el: HTMLElement | null) => {
      if (el) {
        ro.observe(el);
      }
    };
    observe(refs.missionProgressRowRef.current);
    observe(refs.puzzleCountBadgeRef.current);
    observe(refs.tileCardsButtonRef.current);
    observe(refs.headerSpongeRef.current);
    observe(refs.gameBoardRef.current);
    observe(resolveTileLibraryElement());
    observe(resolveTileLibraryStripElement());
    if (tutorialStepUsesLibraryHighlightClip(step)) {
      observe(resolveTileDockInnerElement());
    }
    if (step.target === "puzzlePiece") {
      observe(
        resolvePuzzlePieceElement(
          stripTiles,
          step.puzzlePieceIndex ?? 0,
        ),
      );
    }
    if (step.target === "tileCardsButton") {
      observe(refs.tileCardsButtonRef.current);
    }
    const speechBubbleTarget = step.speechBubbleTarget ?? step.target;
    if (
      speechBubbleTarget === "puzzlePiece" &&
      step.target !== "puzzlePiece"
    ) {
      observe(
        resolvePuzzlePieceElement(
          stripTiles,
          step.puzzlePieceIndex ?? 0,
        ),
      );
    }
    if (
      speechBubbleTarget === "tileLibrary" &&
      step.target !== "tileLibrary"
    ) {
      observe(resolveTileLibraryElement());
    }
    if (
      speechBubbleTarget === "tileLibraryStrip" &&
      step.target !== "tileLibraryStrip"
    ) {
      observe(resolveTileLibraryStripElement());
    }
    if (step.highlightAllLibraryPieces) {
      for (let index = 0; index < stripTiles.length; index += 1) {
        observe(resolvePuzzlePieceElement(stripTiles, index));
      }
    }
    for (const targetId of step.extraHighlightTargets ?? []) {
      if (targetId === "headerMissionProgress") {
        observe(refs.missionProgressRowRef.current);
      } else if (targetId === "puzzleCountBadge") {
        observe(refs.puzzleCountBadgeRef.current);
      } else if (targetId === "tileCardsButton") {
        observe(refs.tileCardsButtonRef.current);
      } else if (targetId === "headerSponge") {
        observe(refs.headerSpongeRef.current);
      } else if (targetId === "gameBoard") {
        observe(refs.gameBoardRef.current);
      } else if (targetId === "tileLibrary") {
        observe(resolveTileLibraryElement());
      } else if (targetId === "tileLibraryStrip") {
        observe(resolveTileLibraryStripElement());
      } else if (targetId === "puzzlePiece") {
        observe(
          resolvePuzzlePieceElement(
            stripTiles,
            step.puzzlePieceIndex ?? 0,
          ),
        );
      }
    }
    return () => {
      window.removeEventListener("resize", onLayout);
      window.removeEventListener("scroll", onLayout, true);
      ro.disconnect();
    };
  }, [active, step?.id, stripTileIdsKey, remeasure]);

  return measured;
}
