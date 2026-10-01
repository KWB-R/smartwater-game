import type { NavigateOptions } from "react-router-dom";

function prefersReducedMotionNow(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Aktiviert viewTransition, sofern keine reduzierten Animationen gewünscht sind. */
export function withViewTransition(
  options?: NavigateOptions,
): NavigateOptions | undefined {
  if (prefersReducedMotionNow()) {
    return options;
  }
  return { ...options, viewTransition: true };
}

/** Navigation ohne zusätzliche Überblendung für bereits animierte Abläufe und dieselbe Route. */
export function withoutViewTransition(
  options?: NavigateOptions,
): NavigateOptions | undefined {
  return { ...options, viewTransition: false };
}
