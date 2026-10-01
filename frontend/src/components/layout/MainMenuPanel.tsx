import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { matchPath, useLocation, useMatches, useNavigate } from "react-router-dom";
import { SchwammHappy } from "@/internal_assets/level/SchwammHappy";
import { ExternalLinkIcon } from "@/internal_assets/icons/ExternalLinkIcon";
import { WebAppIcon } from "@/internal_assets/icons/WebAppIcon";
import { WebAppInstallInstructionsSheet } from "@/components/features/pwa/WebAppInstallInstructionsSheet";
import { withViewTransition } from "@/lib/navigateWithViewTransition";
import { ROUTES, rechtlichesPath, routeHandleIsRechtliches } from "@/routes/paths";
import {
  LEVEL_PLAY_PHASE,
  parseLevelPlayPhaseParam,
  type LevelPlayPhase,
} from "@/routes/level/navigation/levelPlayPhase";
import { AgencyLogo } from "./AgencyLogo";
import { cn } from "@/lib/cn";
import { strapiImgCrossOrigin } from "@/api/strapiMediaImg";
import { fetchRechtliches } from "@/api/services/rechtlichesService";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { useModalAssistiveHide } from "@/hooks/useModalAssistiveHide";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { useShowWebAppInstallHint } from "@/hooks/useShowWebAppInstallHint";
import { useAnalyticsConsent } from "./analyticsConsentContext";
import { useMainMenu } from "./mainMenuContext";
import { useAppSettings } from "./appSettingsContext";
import { MainMenuAllLevelsAccordion } from "./MainMenuAllLevelsAccordion";
import {
  SITE_LOGO_IMG_CLASS,
  SITE_LOGO_MENU_SPACER_CLASS,
  SITE_LOGO_WRAP_CLASS,
} from "./siteLogo";

const MENU_ANIM_MS = 420;

const MENU_NAV_ITEM_BASE =
  "block w-full cursor-pointer border-0 bg-transparent px-1 py-[0.95rem] text-left font-base leading-tight text-inherit focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-swg-blue-mid disabled:cursor-not-allowed disabled:opacity-45";

const MENU_LINK_CLASS = `${MENU_NAV_ITEM_BASE} font-display no-underline`;

const MENU_INFO_LINK_CLASS = `${MENU_LINK_CLASS} flex items-center gap-2.5 [&_svg]:h-7 [&_svg]:w-7 [&_svg]:shrink-0`;

const MENU_BUTTON_CLASS = `${MENU_NAV_ITEM_BASE} font-text`;

const MENU_WEBAPP_INSTALL_CLASS =
  "flex w-full cursor-pointer items-center gap-2.5 border-0 bg-transparent px-1 py-[0.72rem] text-left font-text leading-tight text-inherit focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-swg-blue-mid [&_svg]:h-7 [&_svg]:w-7 [&_svg]:shrink-0";

const MENU_ITEM_CLASS = "border-b border-[rgb(127_190_235/0.45)]";

const LEGAL_FOOTER_LINK_CLASS =
  "flex-1 text-center font-display text-[0.85rem] font-normal text-white no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-swg-blue-mid";

const HINT_TEXT =
  "Die Spielwelten zeigen mögliche Ideen für die Schwammstadt – nicht immer real geplante Orte.";

/** Spielmenü mit Neustart und Beenden in den angegebenen Levelphasen. */
const GAME_MENU_PHASES = new Set<LevelPlayPhase>([
  LEVEL_PLAY_PHASE.placing,
  LEVEL_PLAY_PHASE.preQuiz,
  LEVEL_PLAY_PHASE.quiz,
]);

function isUnderRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function MainMenuPanel() {
  const { isOpen, closeMenu, gameActions, levelLeaveGuard } = useMainMenu();
  const { settings } = useAppSettings();
  const { openConsentBanner, hasConsentContent } = useAnalyticsConsent();
  const infoLinks = settings.externalLinks;
  const legalLinks = settings.legalLinks;
  const reducedMotion = usePrefersReducedMotion();
  const showWebAppInstallHint = useShowWebAppInstallHint();
  const {
    requestInstall,
    installInstructionsOpen,
    installInstructionVariant,
    closeInstallInstructions,
  } = usePwaInstall();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const routeMatches = useMatches();
  const rechtlichesResource = useAsyncResource(() => fetchRechtliches(), []);
  const rechtlichesHref =
    rechtlichesResource.status === "success"
      ? rechtlichesPath(rechtlichesResource.data.slug)
      : null;
  const rechtlichesLabel =
    rechtlichesResource.status === "success"
      ? (rechtlichesResource.data.title ?? "Rechtliches")
      : "Rechtliches";

  const levelRouteMatch = matchPath(
    `${ROUTES.level}/:levelId/:phase?`,
    pathname,
  );
  const onLevel = levelRouteMatch != null;
  const levelPhase = onLevel
    ? parseLevelPlayPhaseParam(levelRouteMatch.params.phase)
    : null;
  const onGallery = isUnderRoute(pathname, ROUTES.gallerie);
  const onInfoContentPage =
    isUnderRoute(pathname, ROUTES.projektpartner) ||
    routeMatches.some((match) => routeHandleIsRechtliches(match.handle));
  const onMapOrGallery = isUnderRoute(pathname, ROUTES.map) || onGallery;

  const showGameLinks = levelPhase != null && GAME_MENU_PHASES.has(levelPhase);
  // Das Tutorial nur während der Platzierungsphase anbieten.
  const showTutorialLink = levelPhase === LEVEL_PLAY_PHASE.placing;
  // Karte und Galerie außerhalb eines Levels wechseln; dort auch die Wiederholung anbieten.
  // Projektpartner/Rechtliches: nur Rückweg zur Karte, keine Galerie.
  const showGalleryLink = !onLevel && !onGallery && !onInfoContentPage;
  const showMapLink = !onLevel && (onGallery || onInfoContentPage);
  const showReplaySlideshowLink = onMapOrGallery;
  const panelRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const assistiveHideActive = isVisible && !isClosing;
  useModalAssistiveHide(assistiveHideActive, panelRef);

  const onWebAppInstallClick = useCallback(() => {
    void requestInstall({
      beforeInstructions: closeMenu,
      afterAttempt: closeMenu,
    });
  }, [closeMenu, requestInstall]);

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setIsVisible(true);
    }
  }, [isOpen]);

  useLayoutEffect(() => {
    if (isOpen || !isVisible || isClosing) {
      return;
    }

    const panel = panelRef.current;
    const active = document.activeElement;
    if (panel && active instanceof HTMLElement && panel.contains(active)) {
      document.getElementById("main-menu-toggle")?.focus();
    }

    setIsClosing(true);
  }, [isOpen, isVisible, isClosing]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isVisible]);

  useEffect(() => {
    if (!isClosing) {
      return;
    }

    const finishClose = () => {
      setIsVisible(false);
      setIsClosing(false);
    };

    if (reducedMotion) {
      finishClose();
      return;
    }

    const panel = panelRef.current;
    if (!panel) {
      finishClose();
      return;
    }

    let finished = false;
    const completeClose = () => {
      if (finished) {
        return;
      }
      finished = true;
      finishClose();
    };

    const onAnimationEnd = (event: AnimationEvent) => {
      if (event.target !== panel) {
        return;
      }
      if (event.animationName !== "main-menu-exit") {
        return;
      }
      completeClose();
    };

    panel.addEventListener("animationend", onAnimationEnd);
    const fallbackTimer = window.setTimeout(completeClose, MENU_ANIM_MS + 50);

    return () => {
      panel.removeEventListener("animationend", onAnimationEnd);
      window.clearTimeout(fallbackTimer);
    };
  }, [isClosing, reducedMotion]);

  const runAndClose = (action?: () => void) => {
    closeMenu();
    action?.();
  };

  const navigateFromMenu = (
    to: string,
    options?: { forceLeavePrompt?: boolean },
  ) => {
    const goToRoute = () => {
      closeMenu();
      navigate(to, withViewTransition());
    };
    if (levelLeaveGuard) {
      levelLeaveGuard.promptLeave(goToRoute, {
        force: options?.forceLeavePrompt,
      });
      return;
    }
    goToRoute();
  };

  const panelClassName = isClosing
    ? "pointer-events-none animate-main-menu-exit motion-reduce:animate-none motion-reduce:opacity-0"
    : "animate-main-menu-enter motion-reduce:animate-none";

  return (
    <>
      {isVisible ? (
        <>
          {/* Außerhalb der Paneltransformation bleibt das Logo an derselben Position wie in der Navigation. */}
          <div
            className={cn(SITE_LOGO_WRAP_CLASS, isClosing && "opacity-0")}
            aria-hidden={isClosing}
          >
            {settings.logoInvertedUrl != null ? (
              <img
                src={settings.logoInvertedUrl}
                alt={isClosing ? "" : settings.logoInvertedAlt}
                className={SITE_LOGO_IMG_CLASS}
                crossOrigin={strapiImgCrossOrigin(settings.logoInvertedUrl)}
                decoding="async"
              />
            ) : (
              <AgencyLogo className={SITE_LOGO_IMG_CLASS} />
            )}
          </div>

          <div
            ref={panelRef}
            className={cn(
              // Die Menüschaltfläche und das Logo liegen darüber und bleiben bedienbar.
              "pointer-events-auto fixed inset-0 z-0 flex flex-col overflow-hidden bg-swg-blue-dark font-display text-white pt-[calc(1rem+env(safe-area-inset-top,0px))] pr-[calc(1.25rem+env(safe-area-inset-right,0px))] pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pl-[calc(1.25rem+env(safe-area-inset-left,0px))]",
              panelClassName,
            )}
            id="burger-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="main-menu-title"
            inert={isClosing}
          >
            <h2 id="main-menu-title" className="sr-only">
              Hauptmenü
            </h2>

            <header className="mb-5 shrink-0 pr-16" aria-hidden>
              <div className={SITE_LOGO_MENU_SPACER_CLASS} />
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4">
              <nav className="m-0" aria-label="Spielmenü">
                <ul className="m-0 list-none p-0 mb-4">
                  {onLevel ? (
                    <li className={MENU_ITEM_CLASS}>
                      <button
                        type="button"
                        className={cn(MENU_BUTTON_CLASS, "b-4 font-bold")}
                        onClick={closeMenu}
                      >
                        weiter spielen
                      </button>
                    </li>
                  ) : null}
                  {showTutorialLink ? (
                    <li className={MENU_ITEM_CLASS}>
                      <button
                        type="button"
                        className={MENU_BUTTON_CLASS}
                        onClick={() => runAndClose(gameActions.onShowTutorial)}
                        disabled={!gameActions.onShowTutorial}
                      >
                        Tutorial anzeigen
                      </button>
                    </li>
                  ) : null}
                  {showGameLinks ? (
                    <>
                      <li className={MENU_ITEM_CLASS}>
                        <button
                          type="button"
                          className={MENU_BUTTON_CLASS}
                          onClick={() =>
                            runAndClose(gameActions.onRestartLevel)
                          }
                          disabled={!gameActions.onRestartLevel}
                        >
                          Bezirk neu starten
                        </button>
                      </li>
                      <li>
                        <button
                          type="button"
                          className={MENU_BUTTON_CLASS}
                          onClick={() =>
                            navigateFromMenu(ROUTES.map, {
                              forceLeavePrompt: true,
                            })
                          }
                        >
                          Bezirk beenden
                        </button>
                      </li>
                    </>
                  ) : null}
                </ul>
                <ul className="m-0 list-none p-0">
                  {showGalleryLink ? (
                    <li className={MENU_ITEM_CLASS}>
                      <button
                        type="button"
                        className={MENU_BUTTON_CLASS}
                        onClick={() => navigateFromMenu(ROUTES.gallerie)}
                      >
                        Galerie-Ansicht
                      </button>
                    </li>
                  ) : null}
                  {showMapLink ? (
                    <li className={MENU_ITEM_CLASS}>
                      <button
                        type="button"
                        className={MENU_BUTTON_CLASS}
                        onClick={() => navigateFromMenu(ROUTES.map)}
                      >
                        Karten-Ansicht
                      </button>
                    </li>
                  ) : null}

                  {showReplaySlideshowLink ? (
                    <li className={MENU_ITEM_CLASS}>
                      <button
                        type="button"
                        className={MENU_BUTTON_CLASS}
                        onClick={() =>
                          navigateFromMenu(ROUTES.slideshowSlide(1))
                        }
                      >
                        Erklärvideo erneut ansehen
                      </button>
                    </li>
                  ) : null}
                  <MainMenuAllLevelsAccordion onNavigate={navigateFromMenu} />

                  {showWebAppInstallHint ? (
                    <li className={MENU_ITEM_CLASS}>
                      <button
                        type="button"
                        className={MENU_WEBAPP_INSTALL_CLASS}
                        onClick={onWebAppInstallClick}
                      >
                        <WebAppIcon />
                        <span>Spiel als App speichern</span>
                      </button>
                    </li>
                  ) : null}
                </ul>
              </nav>

              <aside
                className="relative my-7 rounded-[1.1rem] border-2 border-swg-blue-dark bg-white p-4 pt-[1.35rem] text-swg-blue-dark"
                aria-labelledby="main-menu-hint-label"
              >
                <span
                  className="absolute top-[-0.65rem] right-[0.85rem] rounded-[0.45rem] bg-swg-green-light px-[0.65rem] py-[0.35rem] font-display text-xs font-extrabold tracking-[0.04em] leading-none text-swg-blue-dark"
                  id="main-menu-hint-label"
                >
                  KLEINER HINWEIS
                </span>
                <div className="grid grid-cols-[4.5rem_1fr] items-center gap-3">
                  <SchwammHappy className="block h-auto w-full max-w-[4.25rem] scale-[1.6]" />
                  <p className="m-0 text-[1rem] leading-[1.35] text-swg-blue-dark">
                    {HINT_TEXT}
                  </p>
                </div>
              </aside>

              <nav className="mt-1" aria-label="Informationen">
                <ul className="m-0 list-none p-0">
                  {infoLinks.map((link) => (
                    <li
                      key={`${link.label}-${link.href}`}
                      className={MENU_ITEM_CLASS}
                    >
                      <a
                        className={MENU_INFO_LINK_CLASS}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-sound="button.click"
                        onClick={closeMenu}
                      >
                        <ExternalLinkIcon />
                        <span>{link.label}</span>
                      </a>
                    </li>
                  ))}
                  <li className={MENU_ITEM_CLASS}>
                    <button
                      type="button"
                      className={MENU_BUTTON_CLASS}
                      onClick={() => navigateFromMenu(ROUTES.projektpartner)}
                    >
                      Projektpartner und Förderung
                    </button>
                  </li>
                  {rechtlichesHref ? (
                    <li className={MENU_ITEM_CLASS}>
                      <button
                        type="button"
                        className={MENU_BUTTON_CLASS}
                        onClick={() => navigateFromMenu(rechtlichesHref)}
                      >
                        {rechtlichesLabel}
                      </button>
                    </li>
                  ) : null}
                  {hasConsentContent ? (
                    <li className={MENU_ITEM_CLASS}>
                      <button
                        type="button"
                        className={MENU_BUTTON_CLASS}
                        onClick={() => {
                          closeMenu();
                          openConsentBanner();
                        }}
                      >
                        Statistik-Einwilligung
                      </button>
                    </li>
                  ) : null}
                </ul>
              </nav>

              <p className="m-0 mt-6 text-center font-text text-[0.65rem] leading-none text-white/50">
                Version {__APP_PKG_VERSION__} ({__APP_VERSION__} ·{" "}
                {__APP_BUILD_DATE__})
              </p>
            </div>

            <footer className="flex shrink-0 justify-between gap-3 border-t border-[rgb(127_190_235/0.35)] pt-3">
              {legalLinks.map((link) => (
                <a
                  key={`${link.label}-${link.href}`}
                  className={LEGAL_FOOTER_LINK_CLASS}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-sound="button.click"
                  onClick={closeMenu}
                >
                  {link.label}
                </a>
              ))}
            </footer>
          </div>
        </>
      ) : null}

      <WebAppInstallInstructionsSheet
        open={installInstructionsOpen}
        variant={installInstructionVariant}
        onClose={closeInstallInstructions}
      />
    </>
  );
}
