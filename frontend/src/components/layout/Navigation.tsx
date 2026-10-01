import { useLocation, useMatch, useMatches } from "react-router-dom";
import { strapiImgCrossOrigin } from "@/api/strapiMediaImg";
import { BurgerIcon } from "@/internal_assets/icons/BurgerIcon";
import { CloseIcon } from "@/internal_assets/icons/CloseIcon";
import { cn } from "@/lib/cn";
import { CornerRibbonButton } from "@/components/ui/CornerRibbonButton";
import { ROUTES, routeHandleIsRechtliches } from "@/routes/paths";
import { useAppSettings } from "./appSettingsContext";
import { MainMenuPanel } from "./MainMenuPanel";
import { useMainMenu } from "./mainMenuContext";
import { SITE_LOGO_IMG_CLASS, SITE_LOGO_WRAP_CLASS } from "./siteLogo";

export function Navigation() {
  const { isOpen, toggleMenu } = useMainMenu();
  const { settings } = useAppSettings();
  const location = useLocation();
  const routeMatches = useMatches();
  const isHomeStartPage = useMatch({ path: "/", end: true }) != null;
  const isMapOrGallery =
    location.pathname === ROUTES.map ||
    location.pathname.startsWith(`${ROUTES.map}/`) ||
    location.pathname === ROUTES.gallerie ||
    location.pathname.startsWith(`${ROUTES.gallerie}/`);
  const isInfoContentPage =
    location.pathname === ROUTES.projektpartner ||
    routeMatches.some((match) => routeHandleIsRechtliches(match.handle));
  const showSiteLogo =
    !isOpen &&
    settings.logoUrl != null &&
    (!settings.enabled || isHomeStartPage || isMapOrGallery || isInfoContentPage);

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 top-0 z-(--z-menu)"
      aria-label="Hauptnavigation"
    >
      {showSiteLogo ? (
        <div className={SITE_LOGO_WRAP_CLASS}>
          <img
            src={settings.logoUrl ?? undefined}
            alt={settings.logoAlt}
            className={SITE_LOGO_IMG_CLASS}
            crossOrigin={strapiImgCrossOrigin(settings.logoUrl)}
            decoding="async"
          />
        </div>
      ) : null}
      {settings.enabled ? (
        <>
          <MainMenuPanel />
          <CornerRibbonButton
            id="main-menu-toggle"
            className="pointer-events-auto z-(--z-menu-toggle)"
            iconClassName={cn(
              "transition-transform duration-500 ease-[cubic-bezier(0.165,0.84,0.44,1)] motion-reduce:transition-none",
              isOpen && "rotate-[135deg]",
            )}
            aria-label={isOpen ? "Menü schließen" : "Menü öffnen"}
            aria-expanded={isOpen}
            aria-controls={isOpen ? "burger-modal" : undefined}
            onClick={toggleMenu}
          >
            {isOpen ? <CloseIcon /> : <BurgerIcon />}
          </CornerRibbonButton>
        </>
      ) : null}
    </nav>
  );
}
