import { useCallback, useState, useSyncExternalStore } from "react";
import {
  getPwaInstallInstructionVariant,
  type PwaInstallInstructionVariant,
} from "@/pwa/pwaInstallPlatform";
import {
  clearDeferredInstallPrompt,
  getDeferredInstallPrompt,
  subscribeDeferredInstallPrompt,
} from "@/pwa/pwaDeferredInstallPrompt";

type RequestInstallOptions = {
  /** Aktion vor manuellen Installationshinweisen, etwa zum Schließen des Menüs. */
  beforeInstructions?: () => void;
  /** Aktion nach dem nativen Installationsdialog, etwa zum Schließen des Menüs. */
  afterAttempt?: () => void;
};

type UsePwaInstallResult = {
  requestInstall: (options?: RequestInstallOptions) => Promise<void>;
  installInstructionsOpen: boolean;
  installInstructionVariant: PwaInstallInstructionVariant;
  closeInstallInstructions: () => void;
};

export function usePwaInstall(): UsePwaInstallResult {
  const deferredPrompt = useSyncExternalStore(
    subscribeDeferredInstallPrompt,
    getDeferredInstallPrompt,
    () => null,
  );

  const [installInstructionsOpen, setInstallInstructionsOpen] = useState(false);
  const [installInstructionVariant, setInstallInstructionVariant] =
    useState<PwaInstallInstructionVariant>("ios");

  const openInstallInstructions = useCallback((beforeInstructions?: () => void) => {
    const variant = getPwaInstallInstructionVariant();
    if (!variant) {
      return;
    }
    beforeInstructions?.();
    setInstallInstructionVariant(variant);
    setInstallInstructionsOpen(true);
  }, []);

  const requestInstall = useCallback(
    async (options?: RequestInstallOptions) => {
      if (deferredPrompt) {
        try {
          await deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          if (outcome === "accepted") {
            clearDeferredInstallPrompt();
          }
        } catch {
          openInstallInstructions(options?.beforeInstructions);
        } finally {
          options?.afterAttempt?.();
        }
        return;
      }

      openInstallInstructions(options?.beforeInstructions);
      options?.afterAttempt?.();
    },
    [deferredPrompt, openInstallInstructions],
  );

  const closeInstallInstructions = useCallback(() => {
    setInstallInstructionsOpen(false);
  }, []);

  return {
    requestInstall,
    installInstructionsOpen,
    installInstructionVariant,
    closeInstallInstructions,
  };
}
