export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallNavigator = Pick<
  Navigator,
  "userAgent" | "platform" | "maxTouchPoints"
>;

export type PwaInstallInstructionVariant = "ios" | "android" | "desktop";

/** Erkennt Android-Browser für die Installation über das Browsermenü. */
export function isAndroidInstallBrowser(
  nav: InstallNavigator = typeof navigator !== "undefined"
    ? navigator
    : { userAgent: "", platform: "", maxTouchPoints: 0 },
): boolean {
  return /Android/i.test(nav.userAgent);
}

export function getPwaInstallInstructionVariant(
  nav: InstallNavigator = typeof navigator !== "undefined"
    ? navigator
    : { userAgent: "", platform: "", maxTouchPoints: 0 },
): PwaInstallInstructionVariant | null {
  if (isIosInstallBrowser(nav)) {
    return "ios";
  }
  if (isAndroidInstallBrowser(nav)) {
    return "android";
  }
  return "desktop";
}

/** Erkennt iOS- und iPadOS-Browser ohne programmatisch geöffneten Installationsdialog. */
export function isIosInstallBrowser(
  nav: InstallNavigator = typeof navigator !== "undefined"
    ? navigator
    : { userAgent: "", platform: "", maxTouchPoints: 0 },
): boolean {
  const ua = nav.userAgent;
  if (/iPhone|iPod/i.test(ua)) {
    return true;
  }
  if (/iPad/i.test(ua)) {
    return true;
  }
  return nav.platform === "MacIntel" && nav.maxTouchPoints > 1;
}

export function isBeforeInstallPromptEvent(
  event: Event,
): event is BeforeInstallPromptEvent {
  return (
    "prompt" in event &&
    typeof (event as BeforeInstallPromptEvent).prompt === "function"
  );
}
