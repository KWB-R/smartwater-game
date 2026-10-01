import { fetchPlaceholderPage } from "@/api/services/cmsInfoPageService";
import { CmsInfoPage } from "@/components/features/cms/CmsInfoPage";

/** App abgeschaltet (`settings.enabled === false`) — Inhalt aus Strapi `placeholderpage`. */
export function PlaceholderPage() {
  return (
    <CmsInfoPage
      ariaLabel="App vorübergehend nicht verfügbar"
      load={fetchPlaceholderPage}
    />
  );
}
