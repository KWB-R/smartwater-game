import { cn } from "@/lib/cn";
import { BoardPixiLayer } from "@/components/features/level/scene/BoardPixiLayer";
import { getLevelAssetUrl } from "@/features/level/services/levelAssetUrls";
import { useLevelSessionBoard } from "@/components/features/level/session/levelSessionChromeContext";

export function LevelSessionBoardColumn() {
  const { playLevel, canvasHostRef, designFrameRef, setBoardScene, chrome } =
    useLevelSessionBoard();

  const letterboxBgUrl = playLevel.background.url?.trim()
    ? getLevelAssetUrl(playLevel.background.url)
    : "";

  return (
    <div
      className={cn(
        "level-scene",
        chrome.sceneClassName,
        "relative z-10 flex min-h-0 w-full min-w-0 flex-1 flex-col bg-stone-950",
      )}
    >
      {letterboxBgUrl ? (
        <div
          className="level-scene__letterbox-bg"
          aria-hidden
          style={{ backgroundImage: `url("${letterboxBgUrl}")` }}
        />
      ) : null}
      <div className="level-board-wrap relative mb-0 min-h-0">
        <div className="level-board-host relative flex min-h-0 w-full flex-col overflow-hidden rounded-none border-0 border-t border-white/10 shadow-none">
          <div className="level-design-frame" ref={designFrameRef}>
            <BoardPixiLayer
              canvasHostRef={canvasHostRef}
              videoOverlayHostRef={designFrameRef}
              backgroundUrl={playLevel.background.url}
              coordinateReference={playLevel.coordinateReference}
              onSceneReady={setBoardScene}
              onPointerDown={
                chrome.boardPointerEnabled ? undefined : (e) => e.preventDefault()
              }
              role={chrome.boardRole}
              aria-label={chrome.boardAriaLabel}
            />
            <div
              className="pointer-events-none absolute inset-0 z-[5]"
              aria-hidden
            >
              {chrome.boardChrome}
            </div>
          </div>
        </div>
      </div>
      {chrome.boardOverlay}
    </div>
  );
}
