# Lokale Einrichtung

## Voraussetzungen

- Node.js **22.23.2** (siehe `frontend/.nvmrc`).
- pnpm **9.0.0** für das Frontend, npm **10** für das Backend.
- Eine eigene laufende PostgreSQL-Datenbank mit eigenem Benutzer und Passwort. Der vorhandene Backend-Lockfile enthält den PostgreSQL-Treiber; für SQLite und MySQL sind hier keine Treiber installiert.

Es gibt keinen gemeinsamen Paket-Workspace. Installationen immer im jeweiligen Unterordner ausführen.

## Backend

```sh
cd backend
npm ci
```

`.env.example` nach `.env` kopieren. Für die lokale Datenbank mindestens `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USERNAME` und `DATABASE_PASSWORD` setzen. Die Datenbank und den Benutzer vorher mit den eigenen PostgreSQL-Verwaltungswerkzeugen erstellen. `.env` wird ignoriert.

```sh
node scripts/generate-env-secrets.js
```

Die sechs neu erzeugten Werte in die gleichnamigen Felder der lokalen `.env` übernehmen. Anschließend:

```sh
npm run develop
```

Unter `http://localhost:1337/admin` den ersten eigenen Administrator anlegen. Die Anwendung verlangt standardmäßig eine Zwei-Faktor-Anmeldung (`ADMIN_TOTP_REQUIRED=true`). Kein bestehender Benutzer und keine bisherigen Zugangsdaten werden mitgeliefert.

Inhalte anschließend über das CMS anlegen und veröffentlichen. Für vom Frontend gelesene Inhaltstypen die benötigten `find`-/`findOne`-Berechtigungen in der Rolle „Public“ gezielt aktivieren. Der Code richtet bei der Initialisierung einzelne Analytics-Berechtigungen ein; die übrigen Inhaltsberechtigungen sind separat zu konfigurieren. CMS-Medien werden in der eigenen Instanz hochgeladen.

## Frontend

In einem zweiten Terminal:

```sh
cd frontend
pnpm install --frozen-lockfile
```

`.env.example` nach `.env.local` kopieren. Die Vorlage verweist auf das lokale Backend auf Port 1337. Dann:

```sh
pnpm dev
```

`http://localhost:5173` öffnen. Für eine reine Codeprüfung ohne Backend können `VITE_API_BASE_URL` und `VITE_STRAPI_BASE_URL` in `.env.local` leer bleiben; Inhalte werden dann nicht aus dem CMS geladen. `.env.local` gilt auch für Builds: Vor einem eigenen produktiven Build die URLs gezielt auf die eigene Installation setzen.

## Prüfung

```sh
# frontend/
pnpm test
pnpm lint
pnpm build
pnpm preview

# backend/
npx tsc --noEmit
npm run build
```

`pnpm build` verwendet den Vite-Modus `production`. Ein laufendes CMS ist für die Codekompilierung nicht erforderlich; bei konfigurierten CMS-URLs kann die SEO-Erzeugung Inhalte abrufen. Das Backend-Build erstellt die Verwaltungsoberfläche und benötigt keine Spiel-Assets.

## PWA und HTTPS

Für Service Worker und Offline-Tests eine lokale HTTPS-Verbindung verwenden. In einer eigenen, ignorierten `frontend/.env.pwadev.local` setzen:

```dotenv
VITE_PWA_DEV=true
VITE_API_BASE_URL=http://localhost:1337/api
VITE_STRAPI_BASE_URL=
VITE_STRAPI_PROXY_TARGET=http://127.0.0.1:1337
VITE_SITE_URL=https://localhost:5173
```

Mit `pnpm dev:pwa` starten. Ohne eigene Zertifikate erstellt das vorhandene Vite-Plugin ein selbst signiertes Zertifikat. Für vom System vertrauenswürdige Zertifikate kann unter Windows mit installiertem `mkcert` das optionale `pnpm run setup:https` verwendet werden. Das Skript installiert eine lokale Zertifizierungsstelle und erzeugt lokale Zertifikate; es ist kein Setup-Schritt für den normalen HTTP-Entwicklungsserver.

Offline-Inhalte benötigen zusätzlich eigene CMS-Daten und Medien. Erfolgreicher Build und Service-Worker-Registrierung ersetzen diese Inhaltsbereitstellung nicht.
