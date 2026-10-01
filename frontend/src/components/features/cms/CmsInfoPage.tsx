import type { ReactNode } from "react";
import type { RichTextBlocks } from "@/domain/richText";
import { StrapiBlocksView } from "@/components/features/strapi/StrapiBlocksView";
import { FullscreenLoadingScreen } from "@/components/ui/FullscreenLoadingScreen";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { useReloadOnOnline } from "@/hooks/useOfflineStatus";
import { cn } from "@/lib/cn";
import { isStrapiConfigured } from "@/lib/env";
import "./cmsInfoPage.scss";

type CmsInfoPageContent = {
  content: RichTextBlocks | null;
};

type Props = {
  ariaLabel: string;
  load: () => Promise<CmsInfoPageContent>;
  /** Zentriert den Inhalt, etwa auf der 404-Seite. */
  centered?: boolean;
  /** Optionaler Footer, der nur zusammen mit vorhandenem Inhalt erscheint. */
  footer?: ReactNode;
};

/** Gemeinsames Layout für Informationsseiten aus dem CMS. */
export function CmsInfoPage({ ariaLabel, load, centered = false, footer }: Props) {
  const resource = useAsyncResource(load, []);
  useReloadOnOnline(resource.reload);

  if (resource.status === "loading" || resource.status === "idle") {
    return <FullscreenLoadingScreen />;
  }

  const content =
    resource.status === "success" ? resource.data.content : null;
  const hasContent = Boolean(content?.length);

  return (
    <section
      className={cn("cms-info-page", centered && "cms-info-page--centered")}
      aria-label={ariaLabel}
    >
      <div className="cms-info-page__scroll">
        <div className="cms-info-page__content">
          {resource.status === "error" ? (
            <p
              className="m-0 max-w-[22rem] font-text text-base leading-tight"
              role="alert"
            >
              {resource.error.message}
            </p>
          ) : hasContent ? (
            <StrapiBlocksView
              blocks={content}
              className={centered ? "strapi-blocks-view--align-center" : ""}
              emptyLabel=""
            />
          ) : (
            <p className="m-0 max-w-[22rem] font-text text-base leading-tight">
              {isStrapiConfigured()
                ? "Diese Seite enthält noch keine Inhalte."
                : "Diese Seite muss einmal online geladen werden."}
            </p>
          )}
        </div>
      </div>
      {hasContent && footer ? (
        <footer className="cms-info-page__footer">
          <div className="flex items-center gap-3 px-4 py-[0.85rem]">
            {footer}
          </div>
        </footer>
      ) : null}
    </section>
  );
}
