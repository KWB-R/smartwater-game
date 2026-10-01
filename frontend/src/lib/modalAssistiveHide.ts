/** Menü-Toggle bleibt klickbar, auch wenn darüber ein Sheet liegt (Level-Kachel-Detail …). */
const MAIN_MENU_TOGGLE_ID = "main-menu-toggle";

type HiddenEntry = {
  element: HTMLElement;
  previousAriaHidden: string | null;
  previousInert: boolean;
};

/** Merkt ausgeblendete Elemente je Dialog, damit verschachtelte Dialoge korrekt wiederhergestellt werden. */
const hiddenByModalRoot = new Map<Element, HiddenEntry[]>();

function shouldPreserveForModal(element: Element, modalRoot: Element): boolean {
  const modalId = modalRoot.id;
  if (!modalId || !(element instanceof HTMLElement)) {
    return false;
  }
  return element.getAttribute("aria-controls") === modalId;
}

function isMainMenuToggle(element: Element): boolean {
  return element instanceof HTMLElement && element.id === MAIN_MENU_TOGGLE_ID;
}

function branchContainsMainMenuToggle(element: Element): boolean {
  return (
    element instanceof HTMLElement &&
    element.querySelector(`#${MAIN_MENU_TOGGLE_ID}`) != null
  );
}

function hideBranchRoot(element: HTMLElement, entries: HiddenEntry[]): void {
  if (element.getAttribute("aria-hidden") === "true") {
    return;
  }
  entries.push({
    element,
    previousAriaHidden: element.getAttribute("aria-hidden"),
    previousInert: element.inert,
  });
  element.setAttribute("aria-hidden", "true");
  element.inert = true;
}

/**
 * Verbirgt DOM-Bereiche außerhalb des Dialogs vor Hilfstechnologien und setzt sie inert.
 * So bleiben keine fokussierbaren Kinder unter aria-hidden.
 * Zugeordnete Dialogsteuerungen und der Hauptmenüschalter bleiben erreichbar.
 */
export function mountModalAssistiveHide(modalRoot: HTMLElement): () => void {
  const entries: HiddenEntry[] = [];

  const hideOutsideBranch = (target: Element, parent: Element): void => {
    for (const child of Array.from(parent.children)) {
      if (child === target) {
        continue;
      }
      if (child.contains(target)) {
        hideOutsideBranch(target, child);
        continue;
      }
      if (shouldPreserveForModal(child, modalRoot)) {
        continue;
      }
      if (isMainMenuToggle(child)) {
        continue;
      }
      if (!(child instanceof HTMLElement)) {
        continue;
      }
      if (branchContainsMainMenuToggle(child)) {
        hideOutsideBranch(target, child);
        continue;
      }
      hideBranchRoot(child, entries);
    }
  };

  hideOutsideBranch(modalRoot, document.body);
  hiddenByModalRoot.set(modalRoot, entries);

  return () => {
    const saved = hiddenByModalRoot.get(modalRoot);
    if (!saved) {
      return;
    }
    for (const { element, previousAriaHidden, previousInert } of saved) {
      if (previousAriaHidden === null) {
        element.removeAttribute("aria-hidden");
      } else {
        element.setAttribute("aria-hidden", previousAriaHidden);
      }
      element.inert = previousInert;
    }
    hiddenByModalRoot.delete(modalRoot);
  };
}
