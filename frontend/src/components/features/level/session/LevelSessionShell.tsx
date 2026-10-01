import { useEffect, useMemo } from "react";
import { Outlet, useLocation, useParams } from "react-router-dom";
import { trackLevelStart } from "@/features/analytics/trackLevelStart";
import { useLevelBundle } from "@/features/level/hooks/useLevelBundle";
import { useLevelPlayAssetsContext } from "@/features/level/hooks/useLevelPlayAssetsContext";
import { useLevelRouteSummary } from "@/features/level/hooks/useLevelRouteSummary";
import { cn } from "@/lib/cn";
import { isLevelIntroLocationState } from "@/routes/level/navigation/levelIntroTypes";
import { LevelPlayLayout } from "@/components/features/level/play/LevelPlayLayout";
import { levelGameShellClassName } from "@/components/features/level/session/levelGameShellClassName";
import { LevelSessionBoardColumn } from "@/components/features/level/session/LevelSessionBoardColumn";
import { LevelSessionTileDock } from "@/components/features/level/session/LevelSessionTileDock";
import { LevelSessionPlayLibraryDockFallback } from "@/components/features/level/session/LevelSessionPlayLibraryDockFallback";
import { isLevelPlayOutletPath } from "@/routes/level/navigation/levelSessionPlayRoute";
import {
  LevelSessionBoardProvider,
  useLevelSessionBoard,
} from "@/components/features/level/session/levelSessionChromeContext";
import "@/components/features/level/session/levelGame.scss";

function LevelSessionShellFrame() {
  const { pathname } = useLocation();
  const { chrome, playLevel } = useLevelSessionBoard();
  const shellVariant = chrome.shellVariant;
  const shellClass = levelGameShellClassName(shellVariant);
  const isCompactDock = shellVariant === "compact";
  const playRoute = isLevelPlayOutletPath(pathname);
  const dockContent =
    chrome.dock ??
    (playRoute && !isCompactDock ? (
      <LevelSessionPlayLibraryDockFallback playLevel={playLevel} />
    ) : null);

  return (
    <LevelPlayLayout header={chrome.header} footer={chrome.footer}>
      <div
        className={cn(
          "relative flex h-full min-h-0 w-full flex-1 flex-col",
          shellClass,
        )}
      >
        {chrome.topBar ? (
          <div className="absolute inset-x-0 top-0 z-40 shrink-0">
            {chrome.topBar}
          </div>
        ) : null}
        <div className="relative z-0 flex min-h-0 flex-1 flex-col">
          <div className="level-play__body-row relative z-0 flex min-h-0 flex-1 flex-col overflow-hidden landscape:flex-row landscape:items-stretch [.level-game_&]:grid [.level-game_&]:h-full [.level-game_&]:min-h-0 [.level-game_&]:flex-1 [.level-game_&]:grid-rows-[minmax(0,1fr)_auto] [.level-game--dock-compact_&]:grid-rows-[minmax(0,1fr)_var(--level-tile-dock-height)] [.level-game_&]:landscape:grid [.level-game_&]:landscape:grid-rows-[minmax(0,1fr)_auto] [.level-game--dock-compact_&]:landscape:grid-rows-[minmax(0,1fr)_var(--level-tile-dock-height)]">
            <LevelSessionBoardColumn />
            {dockContent ? (
              <LevelSessionTileDock compact={isCompactDock} ariaLabel="Level-Aktionen">
                {dockContent}
              </LevelSessionTileDock>
            ) : null}
          </div>
        </div>
        {/* Nach dem Brett im DOM und mit höherem z-index liegen Quiz und Vergleich über Brett und Bibliothek. */}
        {chrome.boardSceneStack ? (
          <div className="pointer-events-auto absolute inset-0 z-[100] flex h-full min-h-0 w-full flex-col">
            <div className="pointer-events-none relative h-full min-h-0 w-full flex-1">
              {chrome.boardSceneStack}
            </div>
          </div>
        ) : null}
        {/* Konfetti liegt über dem Vergleich und bleibt beim Übergang sichtbar. */}
        {chrome.boardCelebrationBackdrop ? (
          <div
            className="pointer-events-none absolute inset-0 z-[110] overflow-hidden"
            aria-hidden
          >
            {chrome.boardCelebrationBackdrop}
          </div>
        ) : null}
      </div>
    </LevelPlayLayout>
  );
}

function LevelSessionShellInner() {
  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col">
      <Outlet />
      <LevelSessionShellFrame />
    </div>
  );
}

export function LevelSessionShell() {
  const { levelId } = useParams();
  const location = useLocation();
  const introState = useMemo(() => {
    const state = location.state;
    return isLevelIntroLocationState(state) ? state : null;
  }, [location.state]);
  const { level: cmsLevel } = useLevelRouteSummary(levelId, introState);
  const levelPlayAssets = useLevelPlayAssetsContext({
    introDistrict: introState?.district,
    cmsLevel,
    introLevel: introState?.level,
  });
  const levelBundle = useLevelBundle({
    district: levelPlayAssets.district,
    level: levelPlayAssets.level,
  });
  const levelKey = levelId?.trim() || String(levelBundle.level.id);
  const levelSlug =
    cmsLevel?.slug?.trim() ||
    levelPlayAssets.level?.slug?.trim() ||
    levelKey;

  useEffect(() => {
    trackLevelStart(levelSlug);
  }, [levelSlug]);

  return (
    <LevelSessionBoardProvider
      levelKey={levelKey}
      playLevel={levelBundle.level}
    >
      <LevelSessionShellInner />
    </LevelSessionBoardProvider>
  );
}
