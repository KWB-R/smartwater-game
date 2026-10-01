import { useRef } from "react";
import { strapiImgCrossOrigin } from "@/api/strapiMediaImg";
import { StrapiBlocksView } from "@/components/features/strapi/StrapiBlocksView";
import { useAppSettings } from "@/components/layout/appSettingsContext";
import { useModalAssistiveHide } from "@/hooks/useModalAssistiveHide";
import { SITE_LOGO_IMG_CLASS, SITE_LOGO_WRAP_CLASS } from "@/components/layout/siteLogo";
import { useShowLandscapeFallback } from "@/hooks/useShowLandscapeFallback";
import "./landscapeFallbackScreen.scss";

/**
 * Vollflächiger Querformathinweis mit Inhalt und Bild aus settings.landscapeScreenComponent.
 */
export function LandscapeFallbackScreen() {
  const showFallback = useShowLandscapeFallback();
  const { settings } = useAppSettings();
  const screen = settings.landscapeScreen;
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalAssistiveHide(showFallback, dialogRef);

  if (!showFallback) {
    return null;
  }

  // Fehlender CMS-Inhalt bleibt in Produktion leer; in der Entwicklung einen Hinweis anzeigen.
  if (screen == null && !import.meta.env.DEV) {
    return null;
  }

  return (
    <div
      ref={dialogRef}
      className="landscape-fallback"
      role="dialog"
      aria-modal="true"
      aria-label="Bitte Gerät ins Hochformat drehen"
    >
      {settings.logoUrl != null ? (
        <div className={SITE_LOGO_WRAP_CLASS}>
          <img
            src={settings.logoUrl}
            alt={settings.logoAlt}
            className={SITE_LOGO_IMG_CLASS}
            crossOrigin={strapiImgCrossOrigin(settings.logoUrl)}
            decoding="async"
          />
        </div>
      ) : null}

      <div className="landscape-fallback__row">
        <div className="landscape-fallback__content">
          {screen != null ? (
            <StrapiBlocksView blocks={screen.content} />
          ) : (
            <p>
              Landscape-Fallback aktiv — CMS{" "}
              <code>landscapeScreenComponent</code> fehlt oder ist leer.
            </p>
          )}
        </div>
        {screen?.imageUrl != null ? (
          <div className="landscape-fallback__visual">
            <img
              src={screen.imageUrl}
              alt={screen.imageAlt}
              className="landscape-fallback__image"
              crossOrigin={strapiImgCrossOrigin(screen.imageUrl)}
              decoding="async"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
