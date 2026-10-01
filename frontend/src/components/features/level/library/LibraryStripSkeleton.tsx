import { useCallback, useRef, type KeyboardEvent } from "react";
import { libraryStripContainerClassName } from "./libraryStripContainerClassName";
import { applyHorizontalScrollKeyDown } from "./horizontalScrollRegionKeyboard";

type LibraryStripSkeletonProps = {
  id?: string;
  /** Anzahl Platzhalter-Kacheln (mindestens 1). */
  slotCount: number;
};

function SkeletonTile() {
  return (
    <div
      className="level-tile-strip-item flex shrink-0 flex-col items-center gap-1 pointer-events-none select-none"
      aria-hidden
    >
      <div className="level-tile flex shrink-0 flex-row items-center gap-2 rounded-lg border-0 bg-white px-2.5 py-2">
        <div className="level-tile__visual flex min-w-0 shrink-0 items-center justify-center">
          <div className="overflow-hidden rounded-md bg-white">
            <div className="relative flex size-[100px] items-center justify-center">
              <div className="size-[88px] animate-pulse rounded-md bg-linear-to-br from-slate-200/90 via-slate-100 to-slate-200/90 motion-reduce:animate-none" />
            </div>
          </div>
        </div>
      </div>
      <div
        className="h-3.5 w-[4.5rem] max-w-[100px] animate-pulse rounded bg-slate-200/90 motion-reduce:animate-none"
        aria-hidden
      />
    </div>
  );
}

export function LibraryStripSkeleton({
  id,
  slotCount,
}: LibraryStripSkeletonProps) {
  const count = Math.max(1, Math.min(12, Math.floor(slotCount)));
  const stripRef = useRef<HTMLDivElement>(null);
  const onStripKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    const el = stripRef.current;
    if (!el) {
      return;
    }
    applyHorizontalScrollKeyDown(event, el, { reducedMotion: true });
  }, []);

  return (
    <div
      ref={stripRef}
      id={id}
      tabIndex={0}
      className={libraryStripContainerClassName(
        "level-tile-strip--skeleton gap-3",
      )}
      role="list"
      aria-busy
      aria-label="Bibliothek wird geladen — mit Pfeiltasten scrollen"
      onKeyDown={onStripKeyDown}
    >
      {Array.from({ length: count }, (_, i) => (
        <SkeletonTile key={i} />
      ))}
    </div>
  );
}
