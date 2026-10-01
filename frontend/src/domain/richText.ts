/**
 * Modell des darzustellenden Rich Texts.
 * toStrapiBlocks in @/api/types/strapi übernimmt die CMS-Daten in diese Struktur.
 */
export type RichTextInlineNode =
  | {
      type: "text";
      text: string;
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
      strikethrough?: boolean;
      code?: boolean;
    }
  | { type: "link"; url: string; children: RichTextInlineNode[] };

export type RichTextBlock =
  | { type: "paragraph"; children: RichTextInlineNode[] }
  | { type: "heading"; level: number; children: RichTextInlineNode[] }
  | {
      type: "list";
      format: "ordered" | "unordered";
      children: Array<{ type: "list-item"; children: RichTextInlineNode[] }>;
    }
  | { type: "quote"; children: RichTextInlineNode[] }
  | { type: "code"; children: RichTextInlineNode[] }
  | { type: string; children?: unknown[]; [key: string]: unknown };

export type RichTextBlocks = RichTextBlock[];
