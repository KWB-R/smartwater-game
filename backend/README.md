# SmartWater-CMS

Strapi 5 mit TypeScript, eigenen Inhalts-Schemas, Admin-Erweiterungen und Zwei-Faktor-Anmeldung. Node.js 22.23.2, npm 10 und eine eigene PostgreSQL-Datenbank verwenden.

```sh
npm ci
# .env.example nach .env kopieren und eigene Datenbankwerte setzen
node scripts/generate-env-secrets.js
# Ausgabe in die lokale .env übernehmen
npm run develop
```

Den ersten Administrator unter `http://localhost:1337/admin` anlegen. Die Vorlage verlangt standardmäßig Zwei-Faktor-Anmeldung. Bestehende Benutzer, Datenbankinhalte, Zugangsdaten und hochgeladene Medien sind nicht enthalten.

`npx tsc --noEmit` prüft die Typen, `npm run build` baut die CMS-Verwaltung. Mit `npm run types:frontend` werden die vorhandenen Strapi-Typen in das benachbarte Frontend übernommen; `npm run types:frontend:generate` erzeugt sie vorher neu.

Siehe [Einrichtung](../docs/setup.md), [Konfiguration](../docs/configuration.md) und [Wartung](../docs/maintenance.md).
