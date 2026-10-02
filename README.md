# SmartWater

Anwendungscode für das Spiel **Schwammtastisch**: React-/TypeScript-Frontend und Strapi-CMS in einem Repository.

## Lokal starten

Voraussetzungen: Node.js 22.23.2, pnpm 9 und npm 10 sowie eine eigene PostgreSQL-Datenbank. Frontend und Backend verwenden getrennte Lockfiles.

1. [Einrichtung](docs/setup.md) lesen und das Backend mit eigenen lokalen Schlüsseln einrichten.
2. Im Frontend `pnpm install --frozen-lockfile` ausführen und `.env.example` nach `.env.local` kopieren.
3. Backend mit `npm run develop`, Frontend mit `pnpm dev` starten.

Das Frontend ist unter `http://localhost:5173`, die CMS-Verwaltung unter `http://localhost:1337/admin` erreichbar.

## Lieferumfang

Das Repository enthält die technische Architektur und den Anwendungscode des Spiels einschließlich Frontend, Strapi-CMS, CMS-Schemas, Typen, Tests sowie allgemeiner Ressourcen der Benutzeroberfläche.

Nicht enthalten sind die für die Ausführung des Spiels für die Berliner Regenwasseragentur / das Kompetenzzentrum Wasser Berlin erstellten Inhalte und Medien. Dazu gehören insbesondere Grafiken, Bilder, Videos und Sounds der Spiellevel, die zugehörigen Level-Konfigurationen, CMS-Datenbankinhalte, hochgeladene CMS-Medien sowie Kombi-Share-Videos. Diese werden separat bereitgestellt.

Der Checkout bildet damit die technische Grundlage und Architektur des Spiels, enthält jedoch nicht die vollständig befüllte Ausführung für die Berliner Regenwasseragentur / KWB.

Der Code kann auch ohne diese Inhalte gebaut und getestet werden. Ohne CMS-Konfiguration und Inhalte erscheinen leere Zustände oder Ersatzansichten; die Level-Konfiguration fällt auf eine leere Konfiguration zurück. Eigene Inhalte können separat eingepflegt werden.

## Dokumentation

- [Einrichtung und lokale Prüfung](docs/setup.md)
- [Architektur und Inhaltsabhängigkeiten](docs/architecture.md)
- [Konfiguration](docs/configuration.md)
- [Wartung und Typenabgleich](docs/maintenance.md)

Frontend: [README](frontend/README.md) · Backend: [README](backend/README.md)
