import {
  createContext,
  useContext,
  useEffect,
  type ReactNode,
} from "react";
import {
  EMPTY_APP_SETTINGS,
  fetchAppSettings,
} from "@/api/services/settingService";
import { FullscreenLoadingScreen } from "@/components/ui/FullscreenLoadingScreen";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { useReloadOnOnline } from "@/hooks/useOfflineStatus";
import {
  DEFAULT_DOCUMENT_TITLE,
  resolveSeoDescription,
} from "@/lib/siteDefaults";
import type { AppSettings } from "@/types/content";

type AppSettingsContextValue = {
  settings: AppSettings;
};

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

/** Ersatzbild aus index.html, wenn shareFallbackImage im CMS fehlt. */
const DEFAULT_OG_IMAGE_PATH = "/Link-Preview.png";

/** Setzt `content` auf vorhandenes Meta-Element (name oder property). */
function setMetaContent(attr: "name" | "property", key: string, content: string) {
  const el = document.querySelector(`meta[${attr}="${key}"]`);
  if (el) el.setAttribute("content", content);
}

/** Absolute Bild-URL für Linkvorschauen. */
function resolveAbsoluteMetaUrl(urlOrPath: string): string {
  try {
    return new URL(urlOrPath, window.location.origin).href;
  } catch {
    return urlOrPath;
  }
}

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const resource = useAsyncResource(fetchAppSettings, []);
  useReloadOnOnline(resource.reload);

  const isLoading = resource.status === "loading" || resource.status === "idle";
  const settings =
    resource.status === "success" ? resource.data : EMPTY_APP_SETTINGS;

  useEffect(() => {
    const title = settings.siteTitle?.trim() || DEFAULT_DOCUMENT_TITLE;
    document.title = title;
    setMetaContent("property", "og:title", title);
    setMetaContent("property", "og:site_name", title);
    setMetaContent("name", "twitter:title", title);
    setMetaContent("name", "apple-mobile-web-app-title", title);
  }, [settings.siteTitle]);

  useEffect(() => {
    // Für Linkvorschauen die Seitenbeschreibung meta_description verwenden.
    const description = resolveSeoDescription(settings.metaDescription);
    setMetaContent("name", "description", description);
    setMetaContent("property", "og:description", description);
    setMetaContent("name", "twitter:description", description);
  }, [settings.metaDescription]);

  useEffect(() => {
    const imageUrl = settings.shareFallbackImageUrl?.trim();
    const absolute = resolveAbsoluteMetaUrl(
      imageUrl && imageUrl !== "" ? imageUrl : DEFAULT_OG_IMAGE_PATH,
    );
    setMetaContent("property", "og:image", absolute);
    setMetaContent("name", "twitter:image", absolute);
  }, [settings.shareFallbackImageUrl]);

  if (isLoading) {
    return <FullscreenLoadingScreen />;
  }

  return (
    <AppSettingsContext.Provider value={{ settings }}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings(): AppSettingsContextValue {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) {
    throw new Error("useAppSettings must be used within AppSettingsProvider");
  }
  return ctx;
}
