/** Gemeinsame Position und Größe des Logos in Header und Hauptmenü. */
export const SITE_LOGO_WRAP_CLASS =
  "pointer-events-none fixed top-[calc(env(safe-area-inset-top,0px)+1.3rem)] left-[calc(env(safe-area-inset-left,0px)+1rem)] z-(--z-menu-top) max-w-[min(12.5rem,46vw)]";

export const SITE_LOGO_IMG_CLASS =
  "block h-auto max-h-12 w-auto max-w-full object-contain object-left";

/**
 * Reserviert im Menü den Platz des fixierten Logos einschließlich des Abstands zum Panelrand.
 */
export const SITE_LOGO_MENU_SPACER_CLASS = "h-[3.3rem] max-w-[min(12.5rem,46vw)]";
