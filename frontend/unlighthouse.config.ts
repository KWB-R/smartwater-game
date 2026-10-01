import { defineUnlighthouseConfig } from "unlighthouse/config";
import { CORE_ROUTES, PREVIEW_SITE } from "./scripts/coreRoutes.mjs";

/**
 * Prüft die lokal gestartete SPA mit Unlighthouse.
 * Der Scan verwendet die Node-Version aus .nvmrc; die Build-Anforderungen stehen in package.json.
 */
export default defineUnlighthouseConfig({
  site: PREVIEW_SITE,
  // Die Kernrouten ausdrücklich übergeben, statt die Sitemap für den Scan zu verwenden.
  urls: CORE_ROUTES,
  scanner: {
    // JavaScript für die SPA ausführen, damit der Scan die vollständige Seite erfasst.
    skipJavascript: false,
    device: "mobile",
    exclude: ["/debug/**", "/level/**"],
  },
  lighthouseOptions: {
    maxWaitForLoad: 45_000,
  },
});
