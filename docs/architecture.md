# Architektur

## Anwendungen

`frontend/` enthält React 19, TypeScript und Vite. Die Oberfläche verwendet React Router, SCSS/Tailwind und Pixi.js für die Level-Szenen. `src/api/` liest und prüft CMS-Antworten; Mapper überführen diese in die Anwendungstypen. `src/features/level/` enthält Spielmechanik und Medienlogik. `src/pwa/` enthält Service Worker, Cache-Regeln und Offline-Synchronisation.

`backend/` enthält Strapi 5. Inhaltstypen liegen unter `src/api/`, wiederverwendbare Komponenten unter `src/components/`. Die Verwaltungsoberfläche wird unter `src/admin/` erweitert. Das lokale Plugin `src/plugins/admin-totp/` und die Analytics-Anmeldung ergänzen die Zwei-Faktor-Anmeldung. `config/` konfiguriert CMS, Datenbank und Middleware.

## Inhalte und Medien

Das CMS liefert Seiteninhalte, Spieldefinitionen und Medienverweise. Die Level-Konfigurationen werden über `frontend/src/features/level/services/levelConfigByFolder.ts` mit einem Vite-Glob aus `frontend/src/assets/**/config.json` eingelesen. Dieses Inhaltsverzeichnis ist nicht im Lieferumfang. Ohne passende Konfiguration liefert der Code `EMPTY_LEVEL_CONFIG` mit leerem Hintergrund und ohne Objekte.

Die generischen Oberflächengrafiken, Icons, Maskottchen und Sounds liegen separat unter `frontend/src/internal_assets/`. Schriften und PWA-Dateien liegen unter `frontend/public/`. Diese Dateien sind enthalten; sie bilden keinen Ersatz für die fehlenden Level-Inhalte.

CMS-Datenbank und hochgeladene Dateien unter `backend/public/uploads/` sind Laufzeitdaten. Der Checkout liefert nur die Verzeichnisstruktur und Schemas, keine gefüllte Datenbank oder bisherigen Uploads. Kombi-Share-Videos werden über eine eigene konfigurierbare Basis-URL geladen und sind ebenfalls nicht enthalten.

## Typen

Strapi generiert `backend/types/generated/`. Das Skript `backend/scripts/sync-strapi-types.js` überführt diese Typen in das benachbarte `frontend/src/types/strapi/`. Die Anwendungen behalten jeweils ihre eigene Installation und ihren eigenen Lockfile.
