import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type LevelPlayLayoutProps = {
  header: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

export function LevelPlayLayout({
  header,
  children,
  footer,
}: LevelPlayLayoutProps) {
  return (
    <div
      className={cn(
        "level-play relative box-border flex h-full min-h-full w-full min-h-0 max-h-full flex-1 flex-col bg-swg-bg",
        header ? "level-play--with-header" : "level-play--no-header",
      )}
    >
      {header ? (
        <div className="level-play__header-slot relative z-30 box-border h-[var(--level-mission-header-height,120px)] max-h-[var(--level-mission-header-height,120px)] min-h-[var(--level-mission-header-height,120px)] shrink-0 overflow-hidden">
          {header}
        </div>
      ) : null}
      <div className="level-play__main relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
      {footer}
    </div>
  );
}
