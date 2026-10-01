import type { KeyboardEvent } from "react";

const DEFAULT_SCROLL_STEP_PX = 120;

/** Tastatursteuerung des horizontalen Scrollbereichs mit Pfeilen, Home und End. */
export function applyHorizontalScrollKeyDown(
  event: KeyboardEvent<HTMLElement>,
  element: HTMLElement,
  options?: { stepPx?: number; reducedMotion?: boolean },
): void {
  const { key } = event;
  if (
    key !== "ArrowLeft" &&
    key !== "ArrowRight" &&
    key !== "Home" &&
    key !== "End"
  ) {
    return;
  }
  const maxScroll = element.scrollWidth - element.clientWidth;
  if (maxScroll <= 0) {
    return;
  }
  event.preventDefault();
  const step = options?.stepPx ?? DEFAULT_SCROLL_STEP_PX;
  const behavior = options?.reducedMotion ? ("auto" as const) : ("smooth" as const);
  if (key === "ArrowLeft") {
    element.scrollBy({ left: -step, behavior });
    return;
  }
  if (key === "ArrowRight") {
    element.scrollBy({ left: step, behavior });
    return;
  }
  if (key === "Home") {
    element.scrollTo({ left: 0, behavior });
    return;
  }
  element.scrollTo({ left: maxScroll, behavior });
}
