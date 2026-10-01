# SmartWater-Frontend

React 19, TypeScript, Vite, Pixi.js und PWA-Unterstützung. Node.js 22.23.2 und pnpm 9 verwenden.

```sh
pnpm install --frozen-lockfile
# .env.example nach .env.local kopieren
pnpm dev
```

`pnpm test`, `pnpm lint` und `pnpm build` prüfen den Code. `pnpm preview` zeigt den Build. Der Standard-Build verwendet `production`; die lokalen Beispiel-URLs verweisen auf das Backend auf Port 1337.

Spielinhalte und Level-Konfigurationen aus `src/assets/`, CMS-Datensätze/-Uploads und Kombi-Share-Videos sind nicht enthalten. Ohne diese Inhalte ist der Checkout nicht vollständig spielbar. UI-Grafiken und Sounds unter `src/internal_assets/` sowie Schriften/PWA-Dateien unter `public/` sind enthalten.

Die [Einrichtungsanleitung](../docs/setup.md) beschreibt CMS-Anbindung, Prüfung ohne CMS sowie PWA/HTTPS. Weitere Konfiguration steht in [configuration.md](../docs/configuration.md).
