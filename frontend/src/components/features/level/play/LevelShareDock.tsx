import type { ReactNode } from "react";
import { useAppSettings } from "@/components/layout/appSettingsContext";
import { usePrimeShareFiles } from "@/features/level/hooks/usePrimeShareFiles";
import {
  listSharePlatforms,
  shareLevelViaPlatform,
  type SharePlatformId,
} from "@/features/level/services/shareLevelVideo";

type LevelShareDockProps = {
  shareFileVideoUrl: string | null;
  finishedImageUrl: string | null;
  levelName?: string | null;
  /** Bei shareable: false die Plattformschaltflächen ausblenden. */
  shareable?: boolean;
  continueAction: ReactNode;
};

function SharePlatformIcon({ id }: { id: SharePlatformId }) {
  const className = "size-5 fill-swg-blue-dark";
  switch (id) {
    case "snapchat":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path d="M12 2c2.2 0 4 1.5 4.5 3.6.9.2 1.7.6 2.4 1.1-.3 1-.9 1.8-1.7 2.4.8 2.2-.2 4.6-2.2 5.8-.5 2.5-2.6 4.5-5.2 4.5s-4.7-2-5.2-4.5c-2-1.2-3-3.6-2.2-5.8-.8-.6-1.4-1.4-1.7-2.4.7-.5 1.5-.9 2.4-1.1C8 3.5 9.8 2 12 2z" />
        </svg>
      );
    case "facebook":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path d="M14 8h3V4h-3c-2.8 0-5 2.2-5 5v3H6v4h3v8h4v-8h3.2L17 12h-4V9c0-.6.4-1 1-1z" />
        </svg>
      );
    case "tiktok":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path d="M14 4c.5 2.2 2 3.8 4.2 4v3.4c-1.5 0-2.9-.5-4.2-1.4v6.8c0 3-2.4 5.4-5.4 5.4S3.2 17.8 3.2 14.8 5.6 9.4 8.6 9.4c.4 0 .9.1 1.2.2v3.5c-.3-.1-.6-.2-1-.2-1.2 0-2.2 1-2.2 2.2s1 2.2 2.2 2.2 2.2-1 2.2-2.2V4h2.8z" />
        </svg>
      );
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path d="M8 3h8a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5zm8 2H8a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3zm-4 3.5A4.5 4.5 0 1 1 7.5 13 4.5 4.5 0 0 1 12 8.5zm0 2A2.5 2.5 0 1 0 14.5 13 2.5 2.5 0 0 0 12 10.5zM17.5 7a1 1 0 1 1-1 1 1 1 0 0 1 1-1z" />
        </svg>
      );
    case "youtube":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18 5 12 5 12 5s-6 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C6 19 12 19 12 19s6 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15.5v-7l6 3.5-6 3.5z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden>
          <path d="M6 9H3v12h3V9zm1.5-4.5A1.8 1.8 0 1 0 6 6a1.8 1.8 0 0 0 1.5-1.5zM21 20h-3v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.8V20h-3V9h3v2.4h.1c.4-.8 1.5-2.4 3.7-2.4 4 0 4.7 2.6 4.7 6v5h.6z" />
        </svg>
      );
    default:
      return null;
  }
}

/** Inhalt für `LevelSessionTileDock` (äußeres Dock liefert `LevelSessionShell`). */
export function LevelShareDock({
  shareFileVideoUrl,
  finishedImageUrl,
  levelName,
  shareable = true,
  continueAction,
}: LevelShareDockProps) {
  const { settings } = useAppSettings();
  const platforms = listSharePlatforms();
  usePrimeShareFiles(
    shareable,
    shareFileVideoUrl,
    finishedImageUrl,
    settings.shareFallbackImageUrl,
  );

  return (
    <div
      className="flex w-full shrink-0 flex-col px-4 pt-4 pb-3"
      aria-label={shareable ? "Video teilen" : "Weiter"}
    >
      {shareable ? (
        <>
          <p className="text-center font-display text-xl w-[80%] mx-auto">
            Teile das Video und zeige wie viel Schwammstadt in Berlin stecken
            kann!
          </p>
          <ul className="mt-4 flex flex-wrap items-center justify-center gap-3">
            {platforms.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="flex size-12 items-center justify-center rounded-full bg-swg-green-light shadow-sm ring-1 ring-swg-blue-dark/10 transition-transform active:scale-95"
                  aria-label={`Über ${p.label} teilen`}
                  onClick={() => {
                    void shareLevelViaPlatform(p.id, {
                      // Den Link zur aktuellen Teilen-Seite mit combo-Parameter verwenden.
                      pageUrl:
                        typeof window !== "undefined"
                          ? window.location.href
                          : undefined,
                      title: settings.siteTitle,
                      text: settings.shareContent,
                      levelName,
                      videoUrl: shareFileVideoUrl,
                      imageUrl: finishedImageUrl,
                      fallbackImageUrl: settings.shareFallbackImageUrl,
                    });
                  }}
                >
                  <SharePlatformIcon id={p.id} />
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <div
        className={
          shareable
            ? "mt-4 flex w-full shrink-0 justify-center px-1"
            : "flex w-full shrink-0 justify-center px-1"
        }
      >
        {continueAction}
      </div>
    </div>
  );
}
