import type { ReactNode } from "react";
import { Fragment } from "react";
import type {
  RichTextBlocks,
  RichTextInlineNode,
  RichTextBlock,
} from "@/domain/richText";
import {
  blockImagePayload,
  isStrapiImageBlock,
  resolveStrapiBlockImage,
} from "@/api/strapiBlockImage";
import { CmsSvgImage, isCmsSvgUrl } from "@/components/features/strapi/CmsSvgImage";
import { strapiImgCrossOrigin } from "@/api/strapiMediaImg";
import { cn } from "@/lib/cn";
import "./StrapiBlocksView.scss";

type Props = {
  blocks: RichTextBlocks | null | undefined;
  className?: string;
  /** Text, wenn `blocks` fehlt oder leer ist */
  emptyLabel?: string;
};

function isInlineNode(value: unknown): value is RichTextInlineNode {
  if (typeof value !== "object" || value === null || !("type" in value)) {
    return false;
  }
  const t = (value as { type: string }).type;
  return t === "text" || t === "link";
}

function textWithLineBreaks(text: string): ReactNode {
  if (!text.includes("\n")) {
    return text;
  }
  const parts = text.split("\n");
  return parts.map((part, i) => (
    <Fragment key={i}>
      {i > 0 ? <br /> : null}
      {part}
    </Fragment>
  ));
}

function renderTextNode(
  node: Extract<RichTextInlineNode, { type: "text" }>,
  key: string,
): ReactNode {
  let el: ReactNode = textWithLineBreaks(node.text);
  if (node.code) el = <code>{el}</code>;
  if (node.bold) el = <strong>{el}</strong>;
  if (node.italic) el = <em>{el}</em>;
  if (node.underline) el = <u>{el}</u>;
  if (node.strikethrough) el = <s>{el}</s>;
  return <span key={key}>{el}</span>;
}

function hasVisibleInlineText(nodes: RichTextInlineNode[]): boolean {
  return nodes.some((node) => {
    if (node.type === "text") {
      return node.text.length > 0;
    }
    return hasVisibleInlineText(node.children);
  });
}

function renderInlines(nodes: RichTextInlineNode[], keyPrefix: string): ReactNode {
  return nodes.map((node, i) => {
    const key = `${keyPrefix}-${i}`;
    if (node.type === "text") {
      return renderTextNode(node, key);
    }
    return (
      <a key={key} href={node.url} target="_blank" rel="noopener noreferrer">
        {renderInlines(node.children, `${key}-l`)}
      </a>
    );
  });
}

function renderStrapiBlockImage(
  imageValue: unknown,
  baseKey: string,
): ReactNode {
  const resolved = resolveStrapiBlockImage(imageValue);
  if (!resolved) {
    return null;
  }
  return (
    <figure key={baseKey} className="strapi-blocks-view__figure">
      {isCmsSvgUrl(resolved.src) ? (
        <CmsSvgImage src={resolved.src} alt={resolved.alt} />
      ) : (
        <img
          src={resolved.src}
          alt={resolved.alt}
          crossOrigin={strapiImgCrossOrigin(resolved.src)}
        />
      )}
    </figure>
  );
}

function renderUnknownBlock(
  block: RichTextBlock,
  baseKey: string,
): ReactNode {
  const b = block as Record<string, unknown>;
  if (isStrapiImageBlock(b)) {
    return renderStrapiBlockImage(blockImagePayload(b), baseKey);
  }
  const childrenRaw = b.children;
  if (!Array.isArray(childrenRaw)) {
    return null;
  }
  const children = childrenRaw;
  const first = children[0];
  if (isInlineNode(first)) {
    return (
      <p key={baseKey} className="strapi-blocks-view__paragraph">
        {renderInlines(children as RichTextInlineNode[], `u-${baseKey}`)}
      </p>
    );
  }
  return (
    <div key={baseKey} className="strapi-blocks-view__unknown">
      {children.map((child: unknown, i: number) => {
        if (
          typeof child === "object" &&
          child !== null &&
          "type" in child &&
          typeof (child as { type: unknown }).type === "string"
        ) {
          return renderRootBlock(
            child as RichTextBlock,
            `${baseKey}-c-${i}`,
          );
        }
        return null;
      })}
    </div>
  );
}

function renderRootBlock(block: RichTextBlock, baseKey: string): ReactNode {
  switch (block.type) {
    case "paragraph": {
      const b = block as Extract<RichTextBlock, { type: "paragraph" }>;
      return (
        <p key={baseKey} className="strapi-blocks-view__paragraph">
          {hasVisibleInlineText(b.children) ? (
            renderInlines(b.children, `p-${baseKey}`)
          ) : (
            <br />
          )}
        </p>
      );
    }
    case "heading": {
      const b = block as Extract<RichTextBlock, { type: "heading" }>;
      const L = Math.min(6, Math.max(1, b.level)) as 1 | 2 | 3 | 4 | 5 | 6;
      const Tag = `h${L}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
      return (
        <Tag
          key={baseKey}
          className={cn(
            "strapi-blocks-view__heading",
            `strapi-blocks-view__heading--h${L}`,
          )}
        >
          {renderInlines(b.children, `h-${baseKey}`)}
        </Tag>
      );
    }
    case "list": {
      const b = block as Extract<RichTextBlock, { type: "list" }>;
      const List = b.format === "ordered" ? "ol" : "ul";
      return (
        <List key={baseKey} className="strapi-blocks-view__list">
          {b.children.map((item, i) => (
            <li key={`${baseKey}-li-${i}`}>
              {renderInlines(item.children, `li-${baseKey}-${i}`)}
            </li>
          ))}
        </List>
      );
    }
    case "quote": {
      const b = block as Extract<RichTextBlock, { type: "quote" }>;
      return (
        <blockquote key={baseKey} className="strapi-blocks-view__quote">
          {renderInlines(b.children, `q-${baseKey}`)}
        </blockquote>
      );
    }
    case "code": {
      const b = block as Extract<RichTextBlock, { type: "code" }>;
      return (
        <pre key={baseKey} className="strapi-blocks-view__pre">
          <code>{renderInlines(b.children, `c-${baseKey}`)}</code>
        </pre>
      );
    }
    case "image": {
      const b = block as RichTextBlock & Record<string, unknown>;
      return renderStrapiBlockImage(blockImagePayload(b), baseKey);
    }
    default: {
      const b = block as Record<string, unknown>;
      if (isStrapiImageBlock(b)) {
        return renderStrapiBlockImage(blockImagePayload(b), baseKey);
      }
      return renderUnknownBlock(block, baseKey);
    }
  }
}

export function StrapiBlocksView({
  blocks,
  className = "",
  emptyLabel = "Keine Beschreibung",
}: Props) {
  const rootClass = cn("strapi-blocks-view", className);

  if (!blocks?.length) {
    return (
      <div className={cn(rootClass, "strapi-blocks-view--empty")}>
        <span className="strapi-blocks-view__placeholder">{emptyLabel}</span>
      </div>
    );
  }

  return (
    <div className={rootClass}>
      {blocks.map((block, i) => renderRootBlock(block, `b-${i}`))}
    </div>
  );
}
