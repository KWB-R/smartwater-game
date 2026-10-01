import { QRCodeSVG } from "qrcode.react";
import { useLocation } from "react-router-dom";
import { fetchDesktopPage } from "@/api/services/cmsInfoPageService";
import { StrapiBlocksView } from "@/components/features/strapi/StrapiBlocksView";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { useReloadOnOnline } from "@/hooks/useOfflineStatus";
import { useNotFoundPageActive } from "@/routes/notFound/notFoundPageActive";

function desktopQrValue(
  qrToHome: boolean,
  pathname: string,
  search: string,
  hash: string,
): string {
  if (typeof window === "undefined") {
    return qrToHome ? "/" : pathname;
  }
  if (qrToHome) {
    return `${window.location.origin}/`;
  }
  return `${window.location.origin}${pathname}${search}${hash}`;
}

/**
 * CMS-Hinweis und QR-Code neben dem Smartphone-Rahmen.
 * Der QR-Code öffnet die aktuelle App-URL; auf der 404-Seite verweist er auf die Startseite.
 */
export function DesktopFrameAside() {
  const { pathname, search, hash } = useLocation();
  const qrToHome = useNotFoundPageActive();
  const pageUrl = desktopQrValue(qrToHome, pathname, search, hash);

  const desktopPage = useAsyncResource(fetchDesktopPage, []);
  useReloadOnOnline(desktopPage.reload);

  const content =
    desktopPage.status === "success" ? desktopPage.data.content : null;

  return (
    <aside className="app-desktop-aside" aria-label="Hinweis für Desktop">
      {content ? (
        <StrapiBlocksView
          blocks={content}
          className="app-desktop-aside__content"
        />
      ) : null}
      <div className="app-desktop-aside__qr">
        <QRCodeSVG
          value={pageUrl}
          size={200}
          level="M"
          marginSize={0}
          bgColor="transparent"
          fgColor="currentColor"
          title={
            qrToHome
              ? "QR-Code: Startseite auf dem Smartphone öffnen"
              : "QR-Code: Seite auf dem Smartphone öffnen"
          }
        />
      </div>
    </aside>
  );
}
