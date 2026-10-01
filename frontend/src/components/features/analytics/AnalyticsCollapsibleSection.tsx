import { useState, type CSSProperties, type ReactNode } from "react";

type AnalyticsCollapsibleSectionProps = {
  title: string;
  meta?: string;
  defaultOpen?: boolean;
  stickyTop?: number;
  children: ReactNode;
};

const stickyHeaderClass =
  "sticky z-10 -mx-5 border-b border-swg-black/10 bg-white px-5 pb-2";

export function analyticsSectionStickyHeaderStyle(
  stickyTop: number,
): CSSProperties {
  return { top: stickyTop };
}

export function analyticsSectionStickyHeaderClassName(): string {
  return stickyHeaderClass;
}

export function AnalyticsCollapsibleSection({
  title,
  meta,
  defaultOpen = true,
  stickyTop,
  children,
}: AnalyticsCollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const sticky = stickyTop != null && stickyTop >= 0;

  return (
    <div>
      <div
        className={sticky ? `${stickyHeaderClass} -mt-5 pt-5` : undefined}
        style={sticky ? analyticsSectionStickyHeaderStyle(stickyTop) : undefined}
      >
        <button
          type="button"
          className="flex w-full items-center gap-2 text-left"
          aria-expanded={open}
          aria-label={
            open ? `${title} einklappen` : `${title} ausklappen`
          }
          onClick={() => setOpen((prev) => !prev)}
        >
          <span className="text-base leading-none opacity-80" aria-hidden>
            {open ? "▾" : "▸"}
          </span>
        <span className="font-display text-base font-bold">{title}</span>
        {meta ? (
          <span className="ml-auto text-base font-normal opacity-70">{meta}</span>
          ) : null}
        </button>
      </div>
      {open ? children : null}
    </div>
  );
}
