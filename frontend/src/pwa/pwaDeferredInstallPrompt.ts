import {
  type BeforeInstallPromptEvent,
  isBeforeInstallPromptEvent,
} from "@/pwa/pwaInstallPlatform";

type Listener = () => void;

const listeners = new Set<Listener>();
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let listenerAttached = false;

function notifyListeners(): void {
  listeners.forEach((listener) => listener());
}

export function getDeferredInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt;
}

export function clearDeferredInstallPrompt(): void {
  if (!deferredPrompt) {
    return;
  }
  deferredPrompt = null;
  notifyListeners();
}

export function subscribeDeferredInstallPrompt(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Registriert sich früh, damit beforeinstallprompt vor dem React-Start nicht verloren geht. */
export function initPwaDeferredInstallPrompt(): void {
  if (listenerAttached || typeof window === "undefined") {
    return;
  }
  listenerAttached = true;

  window.addEventListener("beforeinstallprompt", (event: Event) => {
    if (!isBeforeInstallPromptEvent(event)) {
      return;
    }
    event.preventDefault();
    deferredPrompt = event;
    notifyListeners();
  });
}
