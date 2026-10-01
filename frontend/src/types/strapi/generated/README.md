# Generierte Strapi-Typen

Nach Schemaänderungen im benachbarten Backend `npm run types:frontend:generate` ausführen. Der Befehl erzeugt die Strapi-Typen und übernimmt sie in dieses Verzeichnis. `npm run types:frontend` kopiert bereits erzeugte Typen ohne erneute Generierung.

Dabei werden `components.d.ts`, `contentTypes.d.ts` sowie die Hilfsdateien `../schema.d.ts` und `../index.ts` geschrieben. Diese Dateien nicht von Hand bearbeiten.

Die von der App verwendeten Inhalts- und Missionstypen stehen separat in `src/types/content.ts` und `src/types/mission.ts`. Sie werden beim Synchronisieren nicht überschrieben.
