import { fetchNotFoundPage } from "@/api/services/cmsInfoPageService";
import { CmsInfoPage } from "@/components/features/cms/CmsInfoPage";
import { ButtonLink } from "@/components/ui/Button";
import { useRegisterNotFoundPage } from "@/routes/notFound/notFoundPageActive";

/** Ansicht für unbekannte Pfade mit Inhalt aus dem Single Type not-found-page. */
export function NotFoundPage() {
  useRegisterNotFoundPage();

  return (
    <CmsInfoPage
      ariaLabel="Seite nicht gefunden"
      centered
      load={fetchNotFoundPage}
      footer={
        <ButtonLink to="/" grow>
          Zur Startseite
        </ButtonLink>
      }
    />
  );
}
