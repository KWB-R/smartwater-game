import { MAIN_CONTENT_ID } from "@/lib/mainContent";

/** Erster Tab-Stopp: springt zum `<main id={MAIN_CONTENT_ID}>`. */
export function SkipToMainContentLink() {
  return (
    <a className="skip-to-main" href={`#${MAIN_CONTENT_ID}`}>
      Zum Inhalt springen
    </a>
  );
}
