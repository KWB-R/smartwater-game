import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

/** Feste Seitenrouten ohne externe Links oder einzelne Spielphasen. */
export const SEO_SHELL_PATHS = [
  "/",
  "/slideshow",
  "/karte",
  "/gallerie",
  "/projektpartner",
];

/**
 * @param {string} siteUrl Origin ohne abschließenden Schrägstrich.
 * @param {boolean} allowIndexing
 * @returns {string}
 */
export function buildRobotsTxt(siteUrl, allowIndexing) {
  if (!allowIndexing) {
    return ["User-agent: *", "Disallow: /", ""].join("\n");
  }
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /analytics",
    "Disallow: /analytics/",
    `Sitemap: ${siteUrl}/sitemap.xml`,
    "",
  ].join("\n");
}

/**
 * @param {string} siteUrl
 * @param {string[]} paths
 * @returns {string}
 */
export function buildSitemapXml(siteUrl, paths) {
  const urls = paths.map((p) => {
    const loc = p === "/" ? `${siteUrl}/` : `${siteUrl}${p}`;
    const priority =
      p === "/"
        ? "1.0"
        : p.startsWith("/karte") || p.startsWith("/level")
          ? "0.8"
          : "0.6";
    return [
      "  <url>",
      `    <loc>${escapeXml(loc)}</loc>`,
      `    <changefreq>weekly</changefreq>`,
      `    <priority>${priority}</priority>`,
      "  </url>",
    ].join("\n");
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
}

/**
 * @typedef {{ key: string, label: string }} SeoEntry
 * @typedef {{ title: string, url: string }} SeoLegalLink
 * @typedef {{
 *   districts: SeoEntry[],
 *   levels: SeoEntry[],
 *   legalLinks: SeoLegalLink[],
 *   rechtlichesPath: string | null,
 *   rechtlichesLabel: string | null,
 *   siteTitle: string | null,
 *   metaDescription: string | null,
 *   shareContent: string | null,
 * }} CmsSeoData
 * @typedef {{
 *   siteTitle: string | null,
 *   metaDescription: string | null,
 *   shareContent: string | null,
 *   shareFallbackImageUrl: string | null,
 * }} CmsShareMeta
 */

const DEFAULT_LLMS_TITLE = "Schwammtastisches Spiel Berlin";
const DEFAULT_LLMS_SUMMARY =
  "Interaktives Regenwasser-/Schwammstadt-Spiel der Berliner Regenwasseragentur.";

/**
 * @param {string} siteUrl
 * @param {CmsSeoData} cms
 * @returns {string}
 */
export function buildLlmsTxt(siteUrl, cms) {
  const title = cms.siteTitle?.trim() || DEFAULT_LLMS_TITLE;
  const summary = resolveShareOgDescription(
    cms.shareContent,
    cms.metaDescription,
    DEFAULT_LLMS_SUMMARY,
  );
  const lines = [
    `# ${title}`,
    "",
    `> ${summary}`,
    "",
    "## Seiten",
    "",
    ...SEO_SHELL_PATHS.map((p) => {
      const loc = p === "/" ? `${siteUrl}/` : `${siteUrl}${p}`;
      const label =
        p === "/"
          ? "Start"
          : p.slice(1).replace(/^\w/, (c) => c.toUpperCase());
      return `- [${label}](${loc})`;
    }),
    ...(cms.rechtlichesPath
      ? [
          `- [${cms.rechtlichesLabel || "Rechtliches"}](${siteUrl}${cms.rechtlichesPath})`,
        ]
      : []),
    "",
  ];

  if (cms.districts.length > 0) {
    lines.push("## Bezirke", "");
    for (const entry of cms.districts) {
      lines.push(
        `- [${entry.label}](${siteUrl}/karte/${encodeURIComponent(entry.key)})`,
      );
    }
    lines.push("");
  }

  if (cms.levels.length > 0) {
    lines.push("## Level", "");
    for (const entry of cms.levels) {
      lines.push(
        `- [${entry.label}](${siteUrl}/level/${encodeURIComponent(entry.key)})`,
      );
    }
    lines.push("");
  }

  if (cms.legalLinks.length > 0) {
    lines.push("## Rechtliches", "");
    for (const entry of cms.legalLinks) {
      lines.push(`- [${entry.title}](${entry.url})`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/** @param {string} value */
function escapeHtmlAttr(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

const SHARE_CONTENT_LINK_PLACEHOLDER = "[[LINK]]";

/**
 * @param {string | null | undefined} shareContent
 * @param {string | null | undefined} metaDescription
 * @param {string} fallback
 */
export function resolveShareOgDescription(
  shareContent,
  metaDescription,
  fallback,
) {
  const fromShare =
    typeof shareContent === "string" ? shareContent.trim() : "";
  if (fromShare) {
    return fromShare
      .split(SHARE_CONTENT_LINK_PLACEHOLDER)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }
  const fromMeta =
    typeof metaDescription === "string" ? metaDescription.trim() : "";
  return fromMeta || fallback;
}

/**
 * Setzt content auf einem Meta-Tag anhand von name oder property.
 * Die Reihenfolge der HTML-Attribute spielt dabei keine Rolle.
 * @param {string} html
 * @param {"name" | "property"} attr
 * @param {string} key
 * @param {string} content
 */
function replaceMetaContent(html, attr, key, content) {
  const escaped = escapeHtmlAttr(content);
  const keyRe = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const after = new RegExp(
    `(<meta\\b[^>]*\\b${attr}=["']${keyRe}["'][^>]*\\bcontent=["'])([^"']*)(["'])`,
    "i",
  );
  if (after.test(html)) {
    return html.replace(after, `$1${escaped}$3`);
  }
  const before = new RegExp(
    `(<meta\\b[^>]*\\bcontent=["'])([^"']*)(["'][^>]*\\b${attr}=["']${keyRe}["'])`,
    "i",
  );
  if (before.test(html)) {
    return html.replace(before, `$1${escaped}$3`);
  }
  return html;
}

/**
 * Schreibt Metadaten aus dem CMS in index.html, damit Crawler sie ohne JavaScript lesen können.
 * @param {string} html
 * @param {CmsShareMeta} meta
 * @param {string} siteUrl Origin ohne abschließenden Schrägstrich.
 * @param {{ defaultDescription: string, defaultOgImagePath?: string }} defaults
 */
export function applyCmsShareMetaToHtml(html, meta, siteUrl, defaults) {
  let out = html;
  const title = meta.siteTitle?.trim();
  if (title) {
    out = out.replace(
      /(<title>)([\s\S]*?)(<\/title>)/i,
      `$1${escapeHtmlAttr(title)}$3`,
    );
    out = replaceMetaContent(out, "property", "og:title", title);
    out = replaceMetaContent(out, "property", "og:site_name", title);
    out = replaceMetaContent(out, "name", "twitter:title", title);
    out = replaceMetaContent(out, "name", "apple-mobile-web-app-title", title);
  }

  const seoDescription =
    meta.metaDescription?.trim() || defaults.defaultDescription;
  out = replaceMetaContent(out, "name", "description", seoDescription);

  const ogDescription = resolveShareOgDescription(
    meta.shareContent,
    meta.metaDescription,
    defaults.defaultDescription,
  );
  out = replaceMetaContent(out, "property", "og:description", ogDescription);
  out = replaceMetaContent(out, "name", "twitter:description", ogDescription);

  const ogImagePath = defaults.defaultOgImagePath ?? "/Link-Preview.png";
  const imageRaw = meta.shareFallbackImageUrl?.trim();
  let imageUrl = `${siteUrl}${ogImagePath.startsWith("/") ? "" : "/"}${ogImagePath}`;
  if (imageRaw) {
    try {
      imageUrl = new URL(imageRaw, siteUrl).href;
    } catch {
      imageUrl = imageRaw;
    }
  }
  out = replaceMetaContent(out, "property", "og:image", imageUrl);
  out = replaceMetaContent(out, "name", "twitter:image", imageUrl);

  return out;
}

/**
 * Löst Strapi-Medien-URLs beim Build zu absoluten URLs auf.
 * @param {string | null | undefined} url
 * @param {string} strapiBase VITE_STRAPI_BASE_URL oder die API-Basis.
 */
export function resolveSeoMediaUrl(url, strapiBase) {
  const s = typeof url === "string" ? url.trim() : "";
  if (!s) return null;
  if (/^https?:\/\//i.test(s) || s.startsWith("data:") || s.startsWith("blob:")) {
    return s;
  }
  const base = strapiBase.replace(/\/$/, "");
  if (!base) return s.startsWith("/") ? s : null;
  if (s.startsWith("//")) {
    return `https:${s}`;
  }
  if (s.startsWith("/")) {
    return `${base}${s}`;
  }
  return s;
}

/**
 * Liest Metadaten zum Teilen und für Suchmaschinen aus den CMS-Einstellungen.
 * @param {string} apiBase
 * @param {string} strapiBase Basis für relative Medien-URLs.
 * @returns {Promise<CmsShareMeta>}
 */
export async function fetchCmsShareMeta(apiBase, strapiBase = "") {
  /** @type {CmsShareMeta} */
  const empty = {
    siteTitle: null,
    metaDescription: null,
    shareContent: null,
    shareFallbackImageUrl: null,
  };
  if (!apiBase?.trim()) {
    return empty;
  }
  const base = apiBase.replace(/\/$/, "");
  try {
    const settingJson = await fetchCmsJson(
      base,
      "/setting?populate[shareComponent][populate][shareFallbackImage]=true",
    );
    const settingData =
      /** @type {Record<string, unknown> | null} */ (settingJson?.data) ?? null;
    const attrs = settingData
      ? /** @type {Record<string, unknown>} */ (
          settingData.attributes ?? settingData
        )
      : null;
    if (!attrs) return empty;

    const siteTitle = readTrimmedString(attrs.title) || null;
    const metaDescription =
      readTrimmedString(attrs.meta_description) || null;

    const shareRaw = attrs.shareComponent;
    const shareRow =
      shareRaw && typeof shareRaw === "object"
        ? /** @type {Record<string, unknown>} */ (
            /** @type {{ data?: unknown }} */ (shareRaw).data ?? shareRaw
          )
        : null;
    const shareAttrs = shareRow
      ? /** @type {Record<string, unknown>} */ (
          shareRow.attributes ?? shareRow
        )
      : null;
    const shareContent = shareAttrs
      ? readTrimmedString(shareAttrs.shareContent) || null
      : null;

    const imageRaw = shareAttrs?.shareFallbackImage;
    const imageRow =
      imageRaw && typeof imageRaw === "object"
        ? /** @type {Record<string, unknown>} */ (
            /** @type {{ data?: unknown }} */ (imageRaw).data ?? imageRaw
          )
        : null;
    const imageAttrs = imageRow
      ? /** @type {Record<string, unknown>} */ (
          imageRow.attributes ?? imageRow
        )
      : null;
    const mediaUrl = imageAttrs
      ? readTrimmedString(imageAttrs.url) || null
      : null;
    const mediaBase = strapiBase.trim() || base;
    const shareFallbackImageUrl = resolveSeoMediaUrl(mediaUrl, mediaBase);

    return {
      siteTitle,
      metaDescription,
      shareContent,
      shareFallbackImageUrl,
    };
  } catch (error) {
    console.warn("[seo] Share-Meta-Fetch fehlgeschlagen:", error);
    return empty;
  }
}

/** @param {unknown} value */
function readTrimmedString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

/**
 * Ermittelt den Routenschlüssel wie die App: slug, bezirkId, documentId, dann id.
 * @param {Record<string, unknown>} attrs
 * @param {Record<string, unknown>} entry
 */
function districtSeoKey(attrs, entry) {
  return (
    readTrimmedString(attrs.slug) ||
    readTrimmedString(attrs.bezirkId) ||
    readTrimmedString(entry.documentId) ||
    readTrimmedString(attrs.documentId) ||
    (attrs.id != null ? String(attrs.id) : "") ||
    (entry.id != null ? String(entry.id) : "")
  );
}

/**
 * Ermittelt den Routenschlüssel wie levelRouteSlug: slug, documentId, dann id.
 * @param {Record<string, unknown>} attrs
 * @param {Record<string, unknown>} entry
 */
function levelSeoKey(attrs, entry) {
  return (
    readTrimmedString(attrs.slug) ||
    readTrimmedString(entry.documentId) ||
    readTrimmedString(attrs.documentId) ||
    (attrs.id != null ? String(attrs.id) : "") ||
    (entry.id != null ? String(entry.id) : "")
  );
}

/**
 * @param {Record<string, unknown>} attrs
 * @param {string} key
 */
function seoLabel(attrs, key) {
  return readTrimmedString(attrs.name) || key;
}

/**
 * @param {string} base API-Basis ohne abschließenden Schrägstrich.
 * @param {string} pathAndQuery Zum Beispiel /bezirks?…
 */
async function fetchCmsJson(base, pathAndQuery) {
  const url = `${base}${pathAndQuery.startsWith("/") ? "" : "/"}${pathAndQuery}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`[seo] CMS-Fetch ${res.status}: ${url}`);
    return null;
  }
  return res.json();
}

/**
 * Übernimmt legalLinks aus den CMS-Einstellungen.
 * @param {unknown} raw
 * @returns {SeoLegalLink[]}
 */
function mapLegalLinks(raw) {
  const list = Array.isArray(raw) ? raw : [];
  /** @type {SeoLegalLink[]} */
  const links = [];
  for (const entry of list) {
    const row = /** @type {Record<string, unknown>} */ (entry ?? {});
    const attrs = /** @type {Record<string, unknown>} */ (
      row.attributes ?? row
    );
    const title = readTrimmedString(attrs.title);
    const url = readTrimmedString(attrs.link);
    if (!title || !url) continue;
    links.push({ title, url });
  }
  return links;
}

/**
 * @param {string} apiBase VITE_API_BASE_URL ohne abschließenden Schrägstrich.
 * @returns {Promise<CmsSeoData>}
 */
export async function fetchCmsSeoSlugs(apiBase) {
  /** @type {CmsSeoData} */
  const empty = {
    districts: [],
    levels: [],
    legalLinks: [],
    rechtlichesPath: null,
    rechtlichesLabel: null,
    siteTitle: null,
    metaDescription: null,
    shareContent: null,
  };
  if (!apiBase?.trim()) {
    return empty;
  }
  const base = apiBase.replace(/\/$/, "");

  try {
    const settingJson = await fetchCmsJson(
      base,
      "/setting?populate[legalLinks]=true&populate[shareComponent]=true",
    );
    const settingData =
      /** @type {Record<string, unknown> | null} */ (settingJson?.data) ?? null;
    const settingAttrs = settingData
      ? /** @type {Record<string, unknown>} */ (
          settingData.attributes ?? settingData
        )
      : null;
    const legalLinks = mapLegalLinks(settingAttrs?.legalLinks);
    const siteTitle = readTrimmedString(settingAttrs?.title) || null;
    const metaDescription =
      readTrimmedString(settingAttrs?.meta_description) || null;
    const shareRaw = settingAttrs?.shareComponent;
    const shareRow =
      shareRaw && typeof shareRaw === "object"
        ? /** @type {Record<string, unknown>} */ (
            /** @type {{ data?: unknown }} */ (shareRaw).data ?? shareRaw
          )
        : null;
    const shareAttrs = shareRow
      ? /** @type {Record<string, unknown>} */ (
          shareRow.attributes ?? shareRow
        )
      : null;
    const shareContent = shareAttrs
      ? readTrimmedString(shareAttrs.shareContent) || null
      : null;

    const settingMeta = { siteTitle, metaDescription, shareContent };

    const rechtlichJson = await fetchCmsJson(base, "/rechtlich");
    const rechtlichData =
      /** @type {Record<string, unknown> | null} */ (rechtlichJson?.data) ??
      null;
    const rechtlichAttrs = rechtlichData
      ? /** @type {Record<string, unknown>} */ (
          rechtlichData.attributes ?? rechtlichData
        )
      : null;
    const rechtlichesSlug = readTrimmedString(rechtlichAttrs?.slug);
    const reservedRechtlichesSlugs = new Set([
      "slideshow",
      "karte",
      "gallerie",
      "projektpartner",
      "level",
    ]);
    const rechtlichesPath =
      rechtlichesSlug && !reservedRechtlichesSlugs.has(rechtlichesSlug)
        ? `/${encodeURIComponent(rechtlichesSlug)}`
        : null;
    const rechtlichesLabel = rechtlichesPath
      ? readTrimmedString(rechtlichAttrs?.title) || "Rechtliches"
      : null;

    // Die vollständige Bezirksliste laden; fields[slug] scheitert bei CMS-Versionen ohne Slug-Feld.
    const bezirksJson = await fetchCmsJson(
      base,
      "/bezirks?populate[levels]=true&pagination[pageSize]=100",
    );
    if (!bezirksJson) {
      return {
        ...empty,
        ...settingMeta,
        legalLinks,
        rechtlichesPath,
        rechtlichesLabel,
      };
    }

    const list = Array.isArray(bezirksJson?.data) ? bezirksJson.data : [];
    /** @type {Map<string, SeoEntry>} */
    const districtsByKey = new Map();
    /** @type {Map<string, SeoEntry>} */
    const levelsByKey = new Map();

    for (const entry of list) {
      const row = /** @type {Record<string, unknown>} */ (entry ?? {});
      const attrs = /** @type {Record<string, unknown>} */ (
        row.attributes ?? row
      );
      const districtKey = districtSeoKey(attrs, row);
      if (districtKey && !districtsByKey.has(districtKey)) {
        districtsByKey.set(districtKey, {
          key: districtKey,
          label: seoLabel(attrs, districtKey),
        });
      }

      const levelsRaw =
        /** @type {{ data?: unknown } | unknown} */ (attrs.levels)?.data ??
        attrs.levels ??
        [];
      const levels = Array.isArray(levelsRaw) ? levelsRaw : [];
      for (const levelEntry of levels) {
        const levelRow = /** @type {Record<string, unknown>} */ (
          levelEntry ?? {}
        );
        const levelAttrs = /** @type {Record<string, unknown>} */ (
          levelRow.attributes ?? levelRow
        );
        const levelKey = levelSeoKey(levelAttrs, levelRow);
        if (levelKey && !levelsByKey.has(levelKey)) {
          levelsByKey.set(levelKey, {
            key: levelKey,
            label: seoLabel(levelAttrs, levelKey),
          });
        }
      }
    }

    // Auch Level ergänzen, die keinem Bezirk zugeordnet sind.
    const levelsJson = await fetchCmsJson(
      base,
      "/levels?pagination[pageSize]=100",
    );
    if (levelsJson) {
      const levelList = Array.isArray(levelsJson?.data) ? levelsJson.data : [];
      for (const levelEntry of levelList) {
        const levelRow = /** @type {Record<string, unknown>} */ (
          levelEntry ?? {}
        );
        const levelAttrs = /** @type {Record<string, unknown>} */ (
          levelRow.attributes ?? levelRow
        );
        const levelKey = levelSeoKey(levelAttrs, levelRow);
        if (levelKey && !levelsByKey.has(levelKey)) {
          levelsByKey.set(levelKey, {
            key: levelKey,
            label: seoLabel(levelAttrs, levelKey),
          });
        }
      }
    }

    const districts = [...districtsByKey.values()].sort((a, b) =>
      a.label.localeCompare(b.label, "de"),
    );
    const levels = [...levelsByKey.values()].sort((a, b) =>
      a.label.localeCompare(b.label, "de"),
    );
    return {
      districts,
      levels,
      legalLinks,
      rechtlichesPath,
      rechtlichesLabel,
      ...settingMeta,
    };
  } catch (error) {
    console.warn("[seo] CMS-Fetch fehlgeschlagen:", error);
    return empty;
  }
}

/**
 * @param {{
 *   outDir: string,
 *   siteUrl: string,
 *   allowIndexing: boolean,
 *   apiBase?: string,
 * }} options
 */
export async function generateSeoFiles(options) {
  const siteUrl = options.siteUrl.replace(/\/$/, "");
  const allowIndexing = options.allowIndexing === true;
  const cms = await fetchCmsSeoSlugs(options.apiBase ?? "");

  const paths = [
    ...SEO_SHELL_PATHS,
    ...(cms.rechtlichesPath ? [cms.rechtlichesPath] : []),
    ...cms.districts.map((d) => `/karte/${d.key}`),
    ...cms.levels.map((l) => `/level/${l.key}`),
  ];

  fs.mkdirSync(options.outDir, { recursive: true });
  fs.writeFileSync(
    path.join(options.outDir, "robots.txt"),
    buildRobotsTxt(siteUrl, allowIndexing),
    "utf8",
  );
  fs.writeFileSync(
    path.join(options.outDir, "sitemap.xml"),
    buildSitemapXml(siteUrl, paths),
    "utf8",
  );
  fs.writeFileSync(
    path.join(options.outDir, "llms.txt"),
    buildLlmsTxt(siteUrl, cms),
    "utf8",
  );
}

export function resolveSeoSiteUrl(env) {
  const fromEnv = env.VITE_SITE_URL?.trim().replace(/\/$/, "");
  if (fromEnv) {
    return fromEnv;
  }
  return "http://localhost:5173";
}

export function resolveSeoAllowIndexing(env) {
  return env.VITE_ALLOW_INDEXING === "true";
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const siteUrl = process.env.VITE_SITE_URL ?? resolveSeoSiteUrl({});
  const allowIndexing = process.env.VITE_ALLOW_INDEXING === "true";
  const apiBase = process.env.VITE_API_BASE_URL ?? "";
  await generateSeoFiles({
    outDir: path.resolve(root, "dist"),
    siteUrl,
    allowIndexing,
    apiBase,
  });
  console.info("[seo] geschrieben nach dist/");
}
