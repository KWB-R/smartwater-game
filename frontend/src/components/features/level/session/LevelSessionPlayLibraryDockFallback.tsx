import { useMemo } from "react";
import { LibraryStripSkeleton } from "@/components/features/level/library/LibraryStripSkeleton";
import type { Level } from "@/features/level/types";
import { LevelTileDockInner } from "@/components/features/level/LevelTileDockInner";

type LevelSessionPlayLibraryDockFallbackProps = {
  playLevel: Level;
};

export function LevelSessionPlayLibraryDockFallback({
  playLevel,
}: LevelSessionPlayLibraryDockFallbackProps) {
  const slotCount = useMemo(
    () => Math.min(6, Math.max(3, playLevel.tiles.length)),
    [playLevel.tiles.length],
  );

  return (
    <LevelTileDockInner>
      <LibraryStripSkeleton slotCount={slotCount} />
    </LevelTileDockInner>
  );
}
