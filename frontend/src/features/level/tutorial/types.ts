export type LevelPlayTutorialTargetId =
  | "headerMissionProgress"
  | "headerSponge"
  | "puzzleCountBadge"
  | "tileCardsButton"
  | "puzzlePiece"
  | "gameBoard"
  | "tileLibrary"
  /** Oberkante der Puzzleteile im horizontalen Bibliotheksstreifen. */
  | "tileLibraryStrip";

/** Horizontale Position der Sprechblasen-Pfeilspitze im sichtbaren Bereich. */
export type LevelPlayTutorialPointerAnchorId = "puzzleCountBadge";

type LevelPlayTutorialBubblePlacement =
  | "belowTarget"
  | "aboveTarget"
  | "center"
  | "centerOverBoard";

export type LevelPlayTutorialPointerSide =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "none";

type LevelPlayTutorialAdvance =
  | { type: "primaryButton" }
  /** Nach Öffnen des Puzzleteildetails weiterschalten; den nächsten Schritt erst nach dessen Schließen zeigen. */
  | { type: "detailClosed" }
  | { type: "dragReleased" };

export type LevelPlayTutorialStepConfig = {
  id: string;
  target: LevelPlayTutorialTargetId;
  /** Sprechblase an anderem Element ausrichten als {@link target}. */
  speechBubbleTarget?: LevelPlayTutorialTargetId;
  /** Index im sichtbaren Bibliotheksstreifen, beginnend bei null. */
  puzzlePieceIndex?: number;
  message: string;
  primaryButtonLabel?: string;
  bubblePlacement: LevelPlayTutorialBubblePlacement;
  pointer: LevelPlayTutorialPointerSide;
  /** Richtet die Pfeilspitze an einem Unterelement des Ziels aus, etwa dem Puzzlezähler. */
  pointerAnchor?: LevelPlayTutorialPointerAnchorId;
  highlightPadding?: number;
  /** Abstand Sprechblase ↔ Highlight (px); Standard 14. */
  bubbleGap?: number;
  /** Schritt 3: animierte Hand in der Sprechblase */
  showDragHandIllustration?: boolean;
  /** Zusätzliche Bereiche ohne Abdunklung (z. B. Bibliothek beim Ziehen). */
  alsoUndimTargets?: LevelPlayTutorialTargetId[];
  /** Weitere grüne Rahmen (z. B. Fortschrittszeile in späteren Schritten). */
  extraHighlightTargets?: LevelPlayTutorialTargetId[];
  /** Alle Puzzleteile in der Bibliothek mit grünem Rahmen (wie Schritt 1). */
  highlightAllLibraryPieces?: boolean;
  /** Padding für {@link highlightAllLibraryPieces}; Standard 6. */
  libraryPieceHighlightPadding?: number;
  /** Grüner Rahmen um das primäre Ziel (Standard: an). */
  showPrimaryHighlightRing?: boolean;
  /** Grüne Rahmen pulsieren lassen. */
  highlightPulse?: boolean;
  /** Lässt nur die zusätzlichen Bibliotheksrahmen pulsieren. */
  secondaryHighlightPulse?: boolean;
  /** Sprechblasen-Inhalt: Illustration neben Text. */
  bubbleContentRow?: boolean;
  /** Pfeil horizontal zentriert unter/über der Blase. */
  bubblePointerCentered?: boolean;
  /** Pfeil unten/oben an der Blase: links, Mitte oder rechts (Standard: Mitte bzw. {@link pointerAnchor}). */
  bubblePointerHorizontalAlign?: "left" | "center" | "right";
  /** Abdunkelung um das Highlight (Standard: aus). */
  dimOverlay?: boolean;
  /** Eckradius der Hervorhebungsrahmen als CSS-Länge; Standard sind 2rem. */
  highlightRingBorderRadius?: string;
  advance: LevelPlayTutorialAdvance;
};

export type LevelPlayTutorialRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};
