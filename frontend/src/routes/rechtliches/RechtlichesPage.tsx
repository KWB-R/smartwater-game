import { useParams } from "react-router-dom";
import { fetchRechtliches } from "@/api/services/rechtlichesService";
import { StrapiBlocksView } from "@/components/features/strapi/StrapiBlocksView";
import { ContentStatus } from "@/components/ui/ContentStatus";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { useReloadOnOnline } from "@/hooks/useOfflineStatus";
import { isStrapiConfigured } from "@/lib/env";
import { NotFoundPage } from "@/routes/notFound/NotFoundPage";
import { rechtlichesPath } from "@/routes/paths";
import "./rechtlichesPage.scss";

export function RechtlichesPage() {
  const { legalSlug } = useParams();
  const resource = useAsyncResource(() => fetchRechtliches(), []);
  useReloadOnOnline(resource.reload);

  const page = resource.status === "success" ? resource.data : null;
  const slugMatches =
    rechtlichesPath(page?.slug) != null && page?.slug === legalSlug;

  if (resource.status === "success" && !slugMatches) {
    return <NotFoundPage />;
  }

  const title = page?.title ?? null;
  const hasBlocks = Boolean(page?.content?.length);
  const hasContent = Boolean(title) || hasBlocks;

  return (
    <div className="rechtliches-page">
      <div className="rechtliches-page__scroll">
        <ContentStatus
          status={resource.status}
          error={resource.status === "error" ? resource.error : undefined}
          empty={resource.status === "success" && !hasContent}
          emptyMessage={
            isStrapiConfigured()
              ? "Diese Seite enthält noch keine Inhalte."
              : "Diese Seite muss einmal online geladen werden."
          }
        >
          <article
            className="rechtliches-page__article"
            aria-label={title || "Rechtliches"}
          >
            {title ? (
              <h1 className="rechtliches-page__heading">{title}</h1>
            ) : null}
            {hasBlocks ? (
              <StrapiBlocksView
                blocks={page?.content}
                emptyLabel=""
                className="rechtliches-page__blocks"
              />
            ) : null}
          </article>
        </ContentStatus>
      </div>
    </div>
  );
}
