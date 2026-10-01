import { fetchProjektpartner } from "@/api/services/projektpartnerService";
import { strapiImgCrossOrigin } from "@/api/strapiMediaImg";
import { StrapiBlocksView } from "@/components/features/strapi/StrapiBlocksView";
import { ContentStatus } from "@/components/ui/ContentStatus";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { useReloadOnOnline } from "@/hooks/useOfflineStatus";
import { isStrapiConfigured } from "@/lib/env";
import type { ProjektpartnerImageLink } from "@/types/content";
import "./projektpartnerPage.scss";

function PartnerLogo({ item }: { item: ProjektpartnerImageLink }) {
  const image = (
    <img
      src={item.imageUrl}
      alt={item.imageAlt}
      crossOrigin={strapiImgCrossOrigin(item.imageUrl)}
      className="projektpartner-page__logo-img"
      loading="lazy"
      decoding="async"
    />
  );

  if (item.href) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className="projektpartner-page__logo-link"
        data-sound="button.click"
        aria-label={item.title || item.imageAlt || undefined}
      >
        {image}
      </a>
    );
  }

  return <div className="projektpartner-page__logo-link">{image}</div>;
}

function PartnerLogoGrid({
  items,
  stacked = false,
}: {
  items: ProjektpartnerImageLink[];
  stacked?: boolean;
}) {
  return (
    <ul
      className={
        stacked
          ? "projektpartner-page__logo-grid projektpartner-page__logo-grid--stacked"
          : "projektpartner-page__logo-grid"
      }
    >
      {items.map((item) => (
        <li key={item.id} className="projektpartner-page__logo-cell">
          <PartnerLogo item={item} />
        </li>
      ))}
    </ul>
  );
}

export function ProjektpartnerPage() {
  const resource = useAsyncResource(() => fetchProjektpartner(), []);
  useReloadOnOnline(resource.reload);

  const page = resource.status === "success" ? resource.data : null;
  const hasCollaborateBlocks = Boolean(page?.collaborateContent?.length);
  const hasCollaborators = Boolean(page && page.collaborators.length > 0);
  const hasFundedTitle = Boolean(page?.fundedByTitle);
  const hasFundedMedia = Boolean(page && page.fundedByMedia.length > 0);
  const hasFundedBlocks = Boolean(page?.fundedByContent?.length);
  const hasFunded = hasFundedTitle || hasFundedMedia || hasFundedBlocks;
  const hasContent = hasCollaborateBlocks || hasCollaborators || hasFunded;

  return (
    <div className="projektpartner-page">
      <div className="projektpartner-page__scroll">
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
          <article className="projektpartner-page__article">
            {hasCollaborateBlocks || hasCollaborators ? (
              <section
                className="projektpartner-page__section"
                aria-label="Umgesetzt von"
              >
                {hasCollaborateBlocks ? (
                  <StrapiBlocksView
                    blocks={page?.collaborateContent}
                    emptyLabel=""
                    className="projektpartner-page__blocks"
                  />
                ) : (
                  <h2 className="projektpartner-page__heading">Umgesetzt von</h2>
                )}

                {hasCollaborators ? (
                  <PartnerLogoGrid items={page!.collaborators} />
                ) : null}
              </section>
            ) : null}

            {hasFunded ? (
              <section
                className="projektpartner-page__section projektpartner-page__section--funded"
                aria-label={page?.fundedByTitle || "Gefördert im Rahmen von"}
              >
                {hasFundedTitle ? (
                  <h2 className="projektpartner-page__heading">
                    {page!.fundedByTitle}
                  </h2>
                ) : null}

                {hasFundedMedia ? (
                  <PartnerLogoGrid items={page!.fundedByMedia} stacked />
                ) : null}

                {hasFundedBlocks ? (
                  <StrapiBlocksView
                    blocks={page?.fundedByContent}
                    emptyLabel=""
                    className="projektpartner-page__blocks projektpartner-page__blocks--funded"
                  />
                ) : null}
              </section>
            ) : null}
          </article>
        </ContentStatus>
      </div>
    </div>
  );
}
