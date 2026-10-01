import { cn } from "@/lib/cn";

/** BEM-Varianten von level-game; Änderungen mit levelGame.scss abstimmen. */
const DOCK_COMPACT_CLASS = "level-game--dock-compact";
const DOCK_SHARE_CLASS = "level-game--dock-share";

export type LevelGameShellVariant = "play" | "compact" | "share";

/** Äußeres Spiellayout für Spielen, Einstieg und Teilen. */
export function levelGameShellClassName(
  variant: LevelGameShellVariant = "play",
): string {
  return cn(
    "level-play__game level-game relative z-0 mx-auto flex h-full min-h-0 w-full min-w-0 max-h-full flex-1 flex-col overflow-hidden rounded-none shadow-none",
    (variant === "play" || variant === "share") &&
      "landscape:shadow-lg landscape:shadow-slate-900/10",
    variant === "compact" && DOCK_COMPACT_CLASS,
    variant === "share" && DOCK_SHARE_CLASS,
  );
}
