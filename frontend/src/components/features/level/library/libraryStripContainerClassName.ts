import { cn } from "@/lib/cn";

/** Gemeinsame Gestaltung des Bibliotheksstreifens und seiner Ladeplatzhalter. */
export function libraryStripContainerClassName(extra = ""): string {
  return cn(
    "level-tile-strip",
    "flex min-h-[9rem] max-w-full flex-nowrap items-stretch gap-3 overflow-x-auto overflow-y-hidden [.level-game_&]:min-h-0 [.level-game_&]:h-full [.level-game_&]:max-h-full",
    "touch-pan-x overscroll-x-contain px-3 py-3",
    "[scrollbar-gutter:stable] [scrollbar-width:thin]",
    "rounded-[0.65rem] bg-[#F5F5F5]",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-swg-blue-mid",
    "landscape:min-h-0 landscape:flex-nowrap landscape:items-stretch landscape:overflow-x-auto landscape:overflow-y-hidden landscape:touch-pan-x landscape:overscroll-x-contain",
    extra,
  );
}
