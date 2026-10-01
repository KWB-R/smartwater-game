/**
 * Erkennt Querformatansichten ohne Smartphone-Rahmen.
 * Berücksichtigt Touchgeräte und niedrige Testansichten in den Entwicklertools.
 * Mit den Medienabfragen in _root.scss abstimmen.
 */
export const LANDSCAPE_FALLBACK_MQ =
  "(orientation: landscape) and (max-width: 1024px) and (((hover: none) and (pointer: coarse)) or (max-height: 500px))";
