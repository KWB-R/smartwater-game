import { useLayoutEffect, type RefObject } from "react";
import { mountModalAssistiveHide } from "@/lib/modalAssistiveHide";

/**
 * Setzt `aria-hidden` auf Seiteninhalt außerhalb des Modal-Roots, solange `active`.
 */
export function useModalAssistiveHide(
  active: boolean,
  modalRef: RefObject<HTMLElement | null>,
): void {
  useLayoutEffect(() => {
    if (!active) {
      return;
    }
    const root = modalRef.current;
    if (!root) {
      return;
    }
    return mountModalAssistiveHide(root);
  }, [active, modalRef]);
}
