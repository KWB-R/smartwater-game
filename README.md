# SmartWater

Anwendungscode für das Lernspiel **Schwammtastisch**: React-/TypeScript-Frontend und Strapi-CMS in einem Repository.

## Lokal starten

Voraussetzungen: Node.js 22.23.2, pnpm 9 und npm 10 sowie eine eigene PostgreSQL-Datenbank. Frontend und Backend verwenden getrennte Lockfiles.

1. [Einrichtung](docs/setup.md) lesen und das Backend mit eigenen lokalen Schlüsseln einrichten.
2. Im Frontend `pnpm install --frozen-lockfile` ausführen und `.env.example` nach `.env.local` kopieren.
3. Backend mit `npm run develop`, Frontend mit `pnpm dev` starten.

Das Frontend ist unter `http://localhost:5173`, die CMS-Verwaltung unter `http://localhost:1337/admin` erreichbar.

## Lieferumfang

Enthalten sind Anwendungscode, CMS-Schemas, Typen, Tests sowie Grafiken, Sounds und Schriften der Oberfläche. Die Spielinhalte aus `frontend/src/assets/`, deren Level-Konfigurationen, CMS-Datenbankinhalte, hochgeladene CMS-Medien und Kombi-Share-Videos werden separat bereitgestellt und sind hier nicht enthalten. Dieser Checkout allein enthält daher **keine vollständig spielbare Installation**.

Der Code kann ohne die separaten Level-Assets gebaut und getestet werden. Ohne CMS-Konfiguration und Inhalte erscheinen leere Zustände oder Ersatzansichten; die Level-Konfiguration fällt auf eine leere Konfiguration zurück. Eigene Inhalte müssen separat eingepflegt werden.

## Dokumentation

- [Einrichtung und lokale Prüfung](docs/setup.md)
- [Architektur und Inhaltsabhängigkeiten](docs/architecture.md)
- [Konfiguration](docs/configuration.md)
- [Wartung und Typenabgleich](docs/maintenance.md)

Frontend: [README](frontend/README.md) · Backend: [README](backend/README.md)
