# Konfiguration

Die beiden `.env.example` enthalten lokale Beispielwerte und leere Secret-Felder. Alle tatsächlichen Umgebungsdateien werden ignoriert und gehören nicht ins Repository. Frontend-Variablen mit `VITE_` oder `DEV_` sind im Browser-Bundle sichtbar; dort keine Geheimnisse speichern.

## Frontend

| Variable | Bedeutung |
| --- | --- |
| `VITE_STRAPI_BASE_URL` | Basis für CMS-Medien; lokal `http://localhost:1337` |
| `VITE_API_BASE_URL` | REST-Basis einschließlich `/api`; lokal `http://localhost:1337/api` |
| `VITE_SITE_URL` | Eigene Website-URL für Canonical, Sitemap und Share-Metadaten |
| `VITE_ALLOW_INDEXING` | Nur `true` erlaubt Suchmaschinenindexierung; lokal `false` |
| `VITE_COMBO_VIDEO_BASE_URL` | Eigener Medienserver für Kombi-Share-Videos; Videos separat bereitstellen |
| `VITE_PWA_DEV` | Aktiviert PWA-Entwicklung und HTTPS nur bei `true` |
| `VITE_STRAPI_PROXY_TARGET` | Lokales Ziel des Vite-Proxys; Standard `http://127.0.0.1:1337` |
| `DEV_PANEL_ENABLED` | Entwicklungsoberfläche; nur für lokale Entwicklung einschalten |
| `DEV_FAST_CELEBRATION_OVERLAYS` | Verkürzt lokale Bonus-/Kombi-Overlays |

`pnpm dev` liest `.env.local`. `pnpm build` verwendet `production` und liest ebenfalls `.env.local` sowie gegebenenfalls eigene, ignorierte `.env.production.local`. PWA-Entwicklung liest zusätzlich `.env.pwadev.local`. Einzelheiten zur PWA-Konfiguration stehen in [setup.md](setup.md).

Ohne `VITE_COMBO_VIDEO_BASE_URL` verwendet die Entwicklung einen lokalen Medienserver auf Port 8787; im produktiven Modus bleibt die Kombi-Video-Basis leer. Dieser Medienserver und seine Dateien werden nicht bereitgestellt.

## Backend

| Variable | Bedeutung |
| --- | --- |
| `HOST`, `PORT` | Lokale Bind-Adresse und Port; Vorlage `127.0.0.1:1337` |
| `APP_KEYS` | Vier neu erzeugte, durch Kommas getrennte Anwendungsschlüssel |
| `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `ENCRYPTION_KEY`, `JWT_SECRET` | Jeweils eigener neu erzeugter Wert |
| `DATABASE_CLIENT` | Für diesen Checkout `postgres` |
| `DATABASE_HOST`, `DATABASE_PORT` | Eigene PostgreSQL-Instanz |
| `DATABASE_NAME`, `DATABASE_USERNAME`, `DATABASE_PASSWORD` | Eigene Datenbank und Zugangsdaten |
| `DATABASE_SSL` | SSL zur Datenbank; lokal üblicherweise `false` |
| `ADMIN_TOTP_REQUIRED` | Verpflichtende Zwei-Faktor-Einrichtung für CMS-Administratoren |
| `BEHIND_PROXY` | Nur bei einer selbst eingerichteten vertrauenswürdigen Proxy-Installation einschalten |

Für den lokalen Start `PUBLIC_URL` und `STRAPI_ADMIN_BACKEND_URL` nicht setzen. Die Anleitung verwendet direkte lokale Prozesse und setzt keine mitgelieferte Docker-/Compose-Konfiguration voraus.
