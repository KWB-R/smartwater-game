import { cn } from "@/lib/cn";
import type { Tile } from "@/features/level/types";
import { shouldShowDropTargetSocket } from "@/features/level/logic/dropTargetSocketVisibility";
import { getLevelAssetUrl } from "@/features/level/services/levelAssetUrls";

type DropTargetHintsProps = {
  tiles: Tile[];
  letterByTileId: Map<number, string>;
  /** Verbirgt Zielgrafiken für bereits korrekt platzierte Puzzleteile. */
  placedTileIds?: ReadonlySet<number>;
  /** Zielgrafiken erst nach dem Bibliotheksintro einschließlich Rückscrollen zeigen. */
  dropTargetSocketsRevealed?: boolean;
  reducedMotion?: boolean;
  /** Zeigt Buchstaben und Namen zur Prüfung in der Entwicklung. */
  showDebugLabels?: boolean;
  /** Referenzbreite des Designraums (Standard: 800) */
  refW?: number;
  /** Referenzhöhe des Designraums (Standard: 600) */
  refH?: number;
};

/** Zeigt die Ablageziele noch nicht platzierter Puzzleteile. */
export function DropTargetHints({
  tiles,
  letterByTileId,
  placedTileIds = new Set(),
  dropTargetSocketsRevealed = true,
  reducedMotion = false,
  showDebugLabels = false,
  refW = 800,
  refH = 600,
}: DropTargetHintsProps) {
  const socketLayerClass = cn(
    "level-drop-target-hints",
    dropTargetSocketsRevealed && "level-drop-target-hints--sockets-visible",
    reducedMotion && "level-drop-target-hints--reduced-motion",
  );

  // Die volle Designfläche ist die Bezugsfläche für die absolut positionierten Hinweise.
  return (
    <div className={cn(socketLayerClass, "absolute inset-0")}>
      {tiles.map((tile) => {
        const pos = tile.helper?.position ?? tile.position;
        const size = tile.helper?.size ?? tile.size;
        const imagePos = tile.helper?.imagePosition ?? pos;
        const imageSize = tile.helper?.imageSize ?? size;
        const letter = letterByTileId.get(tile.id) ?? "?";
        const showSocket =
          dropTargetSocketsRevealed &&
          shouldShowDropTargetSocket(tile, placedTileIds);
        const helperImg =
          showSocket && tile.helper?.image?.url
            ? getLevelAssetUrl(tile.helper.image.url)
            : null;
        return (
          <div
            key={`hint-${tile.id}`}
            aria-hidden
            style={{
              position: "absolute",
              left: `${(pos.x / refW) * 100}%`,
              top: `${(pos.y / refH) * 100}%`,
              width: `${(size.x / refW) * 100}%`,
              height: `${(size.y / refH) * 100}%`,
              background: "transparent",
              pointerEvents: "none",
              boxSizing: "border-box",
              overflow: tile.helper?.imagePosition ? "visible" : "hidden",
            }}
          >
            {helperImg && (
              <img
                src={helperImg}
                alt=""
                draggable={false}
                className="pointer-events-none select-none"
                style={{
                  position: "absolute",
                  left: `${((imagePos.x - pos.x) / size.x) * 100}%`,
                  top: `${((imagePos.y - pos.y) / size.y) * 100}%`,
                  width: `${(imageSize.x / size.x) * 100}%`,
                  height: `${(imageSize.y / size.y) * 100}%`,
                  objectFit: "fill",
                  opacity: 0.88,
                  pointerEvents: "none",
                  WebkitUserSelect: "none",
                  userSelect: "none",
                }}
              />
            )}
            {showDebugLabels && (
              <div className="pointer-events-none absolute top-0 left-0 z-[2] flex max-w-full flex-col items-start justify-start gap-0.5 p-1">
                <span className="inline-flex h-[1.35rem] min-w-[1.35rem] shrink-0 items-center justify-center rounded bg-green-700 text-xs leading-none font-extrabold text-white">
                  {letter}
                </span>
                <span className="max-w-full overflow-hidden text-[0.65rem] leading-tight font-semibold text-green-900 [text-shadow:0_0_2px_#fff,0_0_4px_#fff]">
                  {tile.name}
                  <small className="font-medium opacity-85"> (ID {tile.id})</small>
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
