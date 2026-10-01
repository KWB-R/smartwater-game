type PuzzleItemLike = {
  uniqueId?: string;
};

/**
 * Liest puzzleItems.{index}.{field} aus einem Feldpfad des Content Managers.
 */
export function parsePuzzleItemIndex(fieldName: string): number | null {
  const match = fieldName.match(/(?:^|\.)puzzleItems\.(\d+)\./);
  if (!match) {
    return null;
  }
  const index = Number.parseInt(match[1], 10);
  return Number.isNaN(index) ? null : index;
}

/**
 * Sammelt die uniqueId-Werte der anderen Puzzleteile im selben Level-Formular.
 */
export function getSiblingPuzzleUniqueIds(
  puzzleItems: unknown,
  currentIndex: number | null,
): string[] {
  if (currentIndex === null || !Array.isArray(puzzleItems)) {
    return [];
  }

  const currentUniqueId =
    (puzzleItems[currentIndex] as PuzzleItemLike | undefined)?.uniqueId?.trim() ?? '';

  const ids = new Set<string>();

  puzzleItems.forEach((item, index) => {
    if (index === currentIndex) {
      return;
    }
    const uniqueId = (item as PuzzleItemLike | undefined)?.uniqueId?.trim();
    if (!uniqueId || uniqueId === currentUniqueId) {
      return;
    }
    ids.add(uniqueId);
  });

  return [...ids].sort((a, b) => a.localeCompare(b, 'de'));
}
