import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { cn } from "@/lib/cn";

type ButtonVariant = "blue" | "purple" | "white";
type ButtonShape = "default" | "roundIcon" | "pill";

export type ButtonStyleProps = {
  /** Farbschema; standardmäßig die blaue Hauptaktion. */
  variant?: ButtonVariant;
  /** `roundIcon`: runder Icon-Button (4×3rem); `pill`: volle Rundung. */
  shape?: ButtonShape;
  /** `flex-1 min-w-0` — füllt die Zeile neben Icon-Buttons. */
  grow?: boolean;
  /** Volle Breite. */
  block?: boolean;
};

const BASE_CLASSES =
  "inline-flex min-h-12 cursor-pointer items-center justify-center rounded-3xl border-0 bg-swg-blue-dark px-5 py-3 text-center font-text text-[1.2rem] leading-[1.25] font-bold text-swg-white no-underline hover:brightness-105 active:brightness-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-swg-blue-mid disabled:cursor-not-allowed disabled:opacity-55 [-webkit-tap-highlight-color:transparent]";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  blue: "",
  purple: "bg-swg-purple",
  white: "bg-swg-white text-swg-black",
};

const SHAPE_CLASSES: Record<ButtonShape, string> = {
  default: "",
  roundIcon: "h-12 w-16 min-h-12 shrink-0 rounded-full p-0",
  pill: "rounded-full shadow-none",
};

/** Schaltflächenklassen ohne eigenes Element, etwa für einen Platzhalter. */
export function buttonClassName(
  { variant = "blue", shape = "default", grow, block }: ButtonStyleProps = {},
  className?: string,
): string {
  return cn(
    BASE_CLASSES,
    VARIANT_CLASSES[variant],
    SHAPE_CLASSES[shape],
    grow && "min-w-0 flex-1",
    block && "flex w-full",
    className,
  );
}

type ButtonProps = ButtonStyleProps & ButtonHTMLAttributes<HTMLButtonElement>;

/** Hauptaktion mit abgerundeten Ecken; den Klicksound übernimmt der globale SoundProvider. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant,
    shape,
    grow,
    block,
    className,
    type = "button",
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClassName({ variant, shape, grow, block }, className)}
      {...rest}
    />
  );
});

type ButtonLinkProps = ButtonStyleProps &
  LinkProps &
  AnchorHTMLAttributes<HTMLAnchorElement>;

/** Router-Link in Schaltflächenoptik; data-sound aktiviert den globalen Klicksound. */
export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  function ButtonLink(
    { variant, shape, grow, block, className, ...rest },
    ref,
  ) {
    return (
      <Link
        ref={ref}
        data-sound="button.click"
        className={buttonClassName({ variant, shape, grow, block }, className)}
        {...rest}
      />
    );
  },
);
