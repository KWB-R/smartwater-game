import { useEffect, useState, type RefObject } from "react";

/** Zusätzlicher Bereich um die ruhenden Bedienelemente, der auch die Größe des gezogenen Teils berücksichtigt. */
const PROXIMITY_PAD_PX = 88;

function pointerNearRect(
  rect: DOMRect,
  clientX: number,
  clientY: number,
  padPx: number,
): boolean {
  return (
    clientX >= rect.left - padPx &&
    clientX <= rect.right + padPx &&
    clientY >= rect.top - padPx &&
    clientY <= rect.bottom + padPx
  );
}

/**
 * Verschiebt Bedienelemente, wenn sich ein gezogener Zeiger nähert.
 * Die Prüfbereiche bleiben an ihren ursprünglichen Positionen.
 */
export function useLibraryBadgeDragDodge(input: {
  dragging: boolean;
  leftSlotRef: RefObject<HTMLElement | null>;
  rightSlotRef: RefObject<HTMLElement | null>;
  centerSlotRef: RefObject<HTMLElement | null>;
}): { dodgeLeft: boolean; dodgeRight: boolean; dodgeCenter: boolean } {
  const { dragging, leftSlotRef, rightSlotRef, centerSlotRef } = input;
  const [dodgeLeft, setDodgeLeft] = useState(false);
  const [dodgeRight, setDodgeRight] = useState(false);
  const [dodgeCenter, setDodgeCenter] = useState(false);

  useEffect(() => {
    if (!dragging) {
      setDodgeLeft(false);
      setDodgeRight(false);
      setDodgeCenter(false);
      return;
    }

    const update = (clientX: number, clientY: number) => {
      const leftRect = leftSlotRef.current?.getBoundingClientRect();
      const rightRect = rightSlotRef.current?.getBoundingClientRect();
      const centerRect = centerSlotRef.current?.getBoundingClientRect();
      setDodgeLeft(
        leftRect != null &&
          pointerNearRect(leftRect, clientX, clientY, PROXIMITY_PAD_PX),
      );
      setDodgeRight(
        rightRect != null &&
          pointerNearRect(rightRect, clientX, clientY, PROXIMITY_PAD_PX),
      );
      setDodgeCenter(
        centerRect != null &&
          pointerNearRect(centerRect, clientX, clientY, PROXIMITY_PAD_PX),
      );
    };

    const onPointerMove = (event: PointerEvent) => {
      update(event.clientX, event.clientY);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, [dragging, leftSlotRef, rightSlotRef, centerSlotRef]);

  return { dodgeLeft, dodgeRight, dodgeCenter };
}
