import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type CornerRibbonButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Icon (wird im gegenrotierten Span gerendert). */
  children: ReactNode;
  /** Zusätzliche Klassen für den Icon-Span (z. B. Rotations-Transition). */
  iconClassName?: string;
};

/**
 * Grünes Eckband für Menü oder Schließen.
 * Die Verwendungsstelle legt Position und z-index über className fest.
 */
export function CornerRibbonButton({
  className,
  iconClassName,
  children,
  type = "button",
  ...rest
}: CornerRibbonButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "fixed top-[calc(env(safe-area-inset-top,0px)-30px)] right-[env(safe-area-inset-right,0px)] flex h-[60px] w-[110px] origin-top-right rotate-[-45deg] cursor-pointer items-center justify-start rounded-[60px_0_0_60px] border-0 bg-swg-green-light py-2.5 pr-0 pl-5 text-swg-blue-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-swg-blue-mid",
        className,
      )}
      {...rest}
    >
      <span
        className={cn(
          "block h-6 w-6 shrink-0 rotate-45 [&_svg]:block [&_svg]:h-full [&_svg]:w-full",
          iconClassName,
        )}
        aria-hidden="true"
      >
        {children}
      </span>
    </button>
  );
}
