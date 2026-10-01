import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type LevelTileDockInnerProps = {
  children: ReactNode;
  className?: string;
};

/** Scrollbarer Inhalt der Puzzleteilablage; die äußere Höhe ist im Level-Layout festgelegt. */
export function LevelTileDockInner({
  children,
  className,
}: LevelTileDockInnerProps) {
  return (
    <div
      className={cn(
        "level-tile-dock-inner relative flex min-h-0 w-full justify-center flex-1 flex-col overflow-x-hidden overflow-y-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}
