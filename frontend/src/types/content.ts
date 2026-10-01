import type { RichTextBlocks } from "@/domain/richText";
import type {
  LevelBonusRow,
  LevelPunkteRecord,
} from "@/domain/levelBonusCategories";

export type HomepageSlideMediaKind = "image" | "video";

export type HomepageSlide = {
  id: string;
  mediaUrl: string;
  mediaKind: HomepageSlideMediaKind;
  mediaMime: string | null;
  /** Vorschaubild für Video-Slides (Strapi-Thumbnail / previewUrl). */
  posterUrl: string | null;
  alt: string;
  content: RichTextBlocks | null;
};

export type HomepageContent = {
  content: RichTextBlocks | null;
  slides: HomepageSlide[];
};

/** Link aus den CMS-Einstellungen. */
export type AppExternalLink = {
  label: string;
  href: string;
};

/** Inhalt des Querformathinweises aus landscapeScreenComponent. */
export type LandscapeScreenContent = {
  content: RichTextBlocks | null;
  imageUrl: string | null;
  imageAlt: string;
};

/** Inhalt der Statistik-Einwilligung aus consent oder consentComponent. */
export type ConsentContent = {
  content: RichTextBlocks;
  acceptButton: string;
  denyButton: string;
};

export type AppSettings = {
  siteTitle: string | null;
  /** Beschreibung für Suchmaschinen und Linkvorschauen aus meta_description. */
  metaDescription: string | null;
  logoUrl: string | null;
  logoAlt: string;
  /** Helles Logo aus logo_inverted für dunkle Hintergründe. */
  logoInvertedUrl: string | null;
  logoInvertedAlt: string;
  externalLinks: AppExternalLink[];
  /** CMS `setting.legalLinks` — Impressum / Datenschutz / Barrierefreiheit. */
  legalLinks: AppExternalLink[];
  /** Beschriftung der Teilen-Aktion aus shareComponent.shareCTA. */
  shareCta: RichTextBlocks | null;
  /** Vorausgefüllter Freigabetext aus shareComponent.shareContent. */
  shareContent: string | null;
  /**
   * Ersatzbild aus shareComponent.shareFallbackImage für Linkvorschauen und nicht verfügbare Kombibilder.
   */
  shareFallbackImageUrl: string | null;
  /**
   * Hinweis für Smartphones und Tablets im Querformat.
   */
  landscapeScreen: LandscapeScreenContent | null;
  /** Einwilligungstext mit Beschriftungen für Zustimmung und Ablehnung. */
  consent: ConsentContent | null;
  /**
   * Nur enabled: false deaktiviert die App und öffnet die Platzhalterseite.
   */
  enabled: boolean;
};

export type MapPageContent = {
  content: RichTextBlocks | null;
  usabilityContent: RichTextBlocks | null;
  /** CMS-Text oben, wenn alle Bezirke gespielt sind. */
  usabilityContentAfterWinning: RichTextBlocks | null;
  /** Untere Überschrift, wenn alle Bezirke gespielt sind. */
  winningContent: RichTextBlocks | null;
};

/** Gemeinsamer Blocks-Inhalt der Desktop-, 404- und Platzhalterseite. */
export type CmsInfoPageContent = {
  content: RichTextBlocks | null;
};

/** Logo + optionaler Link aus CMS-Component `imagelink`. */
export type ProjektpartnerImageLink = {
  id: string;
  title: string;
  href: string | null;
  imageUrl: string;
  imageAlt: string;
};

/** Single-Type `projektpartner`. */
export type ProjektpartnerContent = {
  collaborateContent: RichTextBlocks | null;
  collaborators: ProjektpartnerImageLink[];
  /** CMS-Feld `fundeByTitle` (Tippfehler im Schema). */
  fundedByTitle: string | null;
  fundedByMedia: ProjektpartnerImageLink[];
  fundedByContent: RichTextBlocks | null;
};

/** Single-Type `rechtlich` (Collection `rechtliches`). */
export type RechtlichesContent = {
  title: string | null;
  slug: string | null;
  content: RichTextBlocks | null;
};

export type DistrictLevelMissionSummary = {
  title: string;
  content: RichTextBlocks | null;
  imageUrl: string | null;
  imageAlt: string;
};

export type DistrictLevelPuzzleItem = {
  name: string;
  uniqueId: string;
  /** `uniqueId` des Kombiteils (CMS-Feld `kombiChild` am Eltern-Puzzle-Item). */
  kombiChild?: string | null;
  content: RichTextBlocks | null;
  punkte: LevelPunkteRecord;
};

/** Reihenfolge aus der CMS-Dynamic-Zone (`puzzle-item` + `end-animation`). */
export type LevelPlacementOrderEntry =
  | { kind: "puzzle"; uniqueId: string }
  | { kind: "endAnimation"; uniqueId: string };

export type DistrictLevelQuizAnswer = {
  id: number;
  content: RichTextBlocks | null;
  correctAnswer: boolean;
};

/** Eine Quiz-Frage aus Strapi (`object.question`). */
export type DistrictLevelQuiz = {
  question: RichTextBlocks | null;
  answers: DistrictLevelQuizAnswer[];
};

/** Prozent (0–100) innerhalb der Bezirks-Silhouette auf der Berlin-Karte. */
export type DistrictLevelMapMarkerPosition = {
  x: number;
  y: number;
};

export type DistrictLevelSummary = {
  id: number;
  documentId: string | null;
  name: string;
  /**
   * primaryLevel: false kennzeichnet ein Bonuslevel.
   * Ohne Feld in älteren Antworten wird das Level als Hauptlevel behandelt.
   */
  primaryLevel: boolean;
  /**
   * shareable: false blendet die Teilen-Aktion aus.
   * Ohne Feld in älteren Antworten bleibt das Level teilbar.
   */
  shareable: boolean;
  /** Obergrenze platzierter Puzzleteile aus dem CMS. */
  maxPuzzleItems?: number | null;
  /**
   * Bestehensgrenze als Prozentanteil der maximalen Balkenpunktzahl.
   * Darunter endet das Puzzle ohne Quiz; ab der Grenze öffnet sich der Vergleich vor dem Quiz.
   */
  minimumScorePercentage?: number | null;
  /** Relativ zu `src/assets/` — Ordner mit `config.json` und Level-Medien (CMS `assetsFolder`). */
  assetsFolder: string | null;
  /** Optional: Marker-Position auf der Bezirkskarte (CMS `mapMarkerPosition`, 0–100 %). */
  mapMarkerPosition: DistrictLevelMapMarkerPosition | null;
  /** Geladene Missionsbeziehung des Levels. */
  mission: DistrictLevelMissionSummary | null;
  /** Dynamic Zone `object.puzzle-item` inkl. `punkte`. */
  puzzleItems: DistrictLevelPuzzleItem[];
  /** Vollständige CMS-Reihenfolge einschließlich Endanimationen, die nicht in der Bibliothek erscheinen. */
  placementOrder: LevelPlacementOrderEntry[];
  /** Aus `puzzleItems[].punkte`, nur Kategorien mit aktivem Bonus. */
  achievableBonuses: LevelBonusRow[];
  /** Level-Slug für URLs; gespeicherte Daten verwenden weiterhin documentId. */
  slug: string | null;
  /** Maskottchenvorschau aus dem CMS; Reihenfolge happy, superhappy, unhappy. */
  previewImageUrl: string | null;
  previewImageAlt: string;
  /** Trauriges Maskottchen für Level-Einstieg und Problemstellung. */
  unhappyMascotUrl: string | null;
  unhappyMascotAlt: string;
  happyMascotUrl: string | null;
  happyMascotAlt: string;
  superhappyMascotUrl: string | null;
  superhappyMascotAlt: string;
  problemContent: RichTextBlocks | null;
  quiz: DistrictLevelQuiz | null;
  /** Hinweistext auf der Karten-Detailkarte nach abgeschlossenem Level. */
  winContent: RichTextBlocks | null;
  /** Text auf dem Karten-Detail nach abgeschlossenem Quiz (Überschrift „Geschafft!“). */
  winningContent: RichTextBlocks | null;
};

export type District = {
  id: number;
  documentId: string | null;
  /** CMS UID `slug` — kanonische URL-Identität (`/karte/:slug`). */
  slug: string | null;
  /** Stabiler Schlüssel für die Berlin-SVG (`data-bezirk`). */
  bezirkId: string | null;
  name: string;
  description: RichTextBlocks | null;
  imageUrl: string | null;
  imageAlt: string;
  /** Bezirksbeschriftung in Prozent innerhalb des Bezirksrechtecks. */
  namensOffset: DistrictLevelMapMarkerPosition | null;
  levels: DistrictLevelSummary[];
};
