# Wartung

## Abhängigkeiten und Prüfung

Frontend mit `pnpm install --frozen-lockfile`, Backend mit `npm ci` installieren. Änderungen der Abhängigkeiten müssen im jeweiligen Lockfile nachvollziehbar sein. Vor Änderungen die bestehenden Tests und Builds aus [setup.md](setup.md) ausführen.

Das Frontend bietet außerdem `pnpm knip` für ungenutzte Dateien/Abhängigkeiten und die optionalen Unlighthouse-Befehle für lokale Seitenprüfungen. `pnpm unlighthouse:core` startet nach dem Build eine lokale Vorschau und untersucht die Kernrouten. Diese Prüfungen benötigen einen Browser und für inhaltlich aussagekräftige Ergebnisse eigene CMS-Inhalte.

## CMS-Typen abgleichen

Nach Schemaänderungen im Backend:

```sh
cd backend
npm run types:frontend:generate
```

Zum Übernehmen bereits erzeugter Typen ohne erneute Generierung:

```sh
npm run types:frontend
```

Das Skript verwendet standardmäßig das benachbarte `frontend/`. Der Typenabgleich aktualisiert dessen `src/types/strapi/`; den Diff anschließend prüfen und Frontend-Tests sowie Build ausführen.

## Daten und Inhalte

Eigene CMS-Datenbank und hochgeladene Medien separat sichern. Änderungen an Code und Schemas liefern keine vorhandenen Datensätze mit. Eigene Level-Inhalte und Kombi-Share-Videos müssen ebenfalls separat verwaltet werden. Lokale Umgebungsdateien, Secrets, Zertifikate und Inhaltsdateien unter `frontend/src/assets/` bleiben ignoriert.

## Lieferstände

Dieses Repository enthält ausgewählte Lieferstände von Frontend und Backend mit einer eigenen gemeinsamen History. Neue Lieferungen sind normale Folge-Commits. Die Entwicklung und die Bereitstellung der Lieferstände werden unabhängig von diesem Checkout verwaltet. Kundeneigene Änderungen sollten in einem separaten Arbeitsbranch erfolgen und neue Lieferungen nach Prüfung übernommen werden.
