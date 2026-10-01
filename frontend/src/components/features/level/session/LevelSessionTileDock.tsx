import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type LevelSessionTileDockProps = {
  compact: boolean;
  ariaLabel: string;
  children: ReactNode;
};

export function LevelSessionTileDock({
  compact,
  ariaLabel,
  children,
}: LevelSessionTileDockProps) {
  return (
    <div
      className={cn(
        "level-tile-dock relative z-50 w-full max-w-none shrink-0 translate-none rounded-none bg-swg-bg border-t border-slate-900/10 shadow-[0_-8px_28px_rgba(15,23,42,0.1)]",
        !compact && [
          "landscape:flex landscape:landscape:min-h-0 landscape:w-auto landscape:max-w-[min(25rem,42vw)]",
          "landscape:shrink-0 landscape:grow-0 landscape:basis-[clamp(12rem,36vw,25rem)] landscape:flex-col",
          "landscape:border-t-0 landscape:border-l landscape:px-3 landscape:pt-2.5",
          "landscape:shadow-[-6px_0_20px_rgba(15,23,42,0.06)]",
          "[.level-game_&]:landscape:block [.level-game_&]:landscape:w-auto [.level-game_&]:landscape:max-w-none",
          "[.level-game_&]:landscape:shrink-0 [.level-game_&]:landscape:grow-0 [.level-game_&]:landscape:basis-auto",
          "[.level-game_&]:landscape:border-l-0 [.level-game_&]:landscape:border-t",
          "[.level-game_&]:landscape:px-3 [.level-game_&]:landscape:pt-2.5",
          "[.level-game_&]:landscape:shadow-[0_-8px_28px_rgba(15,23,42,0.1)]",
        ],
      )}
    >
      <section
        className={cn(
          compact
            ? "flex h-full min-h-0 w-full flex-col"
            : [
                "landscape:flex landscape:landscape:min-h-0 landscape:flex-1 landscape:flex-col",
                "[.level-game_&]:landscape:block [.level-game_&]:landscape:min-h-0 [.level-game_&]:landscape:flex-none",
              ],
        )}
        aria-label={ariaLabel}
      >
        {children}
      </section>
    </div>
  );
}
