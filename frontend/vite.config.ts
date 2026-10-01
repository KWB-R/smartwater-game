import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { generatePwaIcons } from "./scripts/generatePwaIcons.mjs";
import {
  applyCmsShareMetaToHtml,
  fetchCmsShareMeta,
  generateSeoFiles,
  resolveSeoAllowIndexing,
  resolveSeoSiteUrl,
} from "./scripts/generateSeoFiles.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MKCERT_KEY = path.resolve(__dirname, "certs/localhost-key.pem");
const MKCERT_CERT = path.resolve(__dirname, "certs/localhost.pem");

function loadMkcertHttps():
  | { key: Buffer; cert: Buffer }
  | undefined {
  if (!fs.existsSync(MKCERT_KEY) || !fs.existsSync(MKCERT_CERT)) {
    return undefined;
  }
  return {
    key: fs.readFileSync(MKCERT_KEY),
    cert: fs.readFileSync(MKCERT_CERT),
  };
}

function readPackageVersion(): string {
  const pkg = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "package.json"), "utf8"),
  ) as { version?: string };
  return pkg.version ?? "0.0.0";
}

// Die Version stammt aus dem Commit-SHA in CI oder lokalem Git; ohne Git gilt local.
function resolveAppVersion(): string {
  const ciSha = process.env.CI_COMMIT_SHORT_SHA ?? process.env.CI_COMMIT_SHA;
  if (ciSha) {
    return ciSha.slice(0, 7);
  }
  try {
    return execSync("git rev-parse --short HEAD", { cwd: __dirname })
      .toString()
      .trim();
  } catch {
    return "local";
  }
}

/**
 * Commitzeit für die Versionsanzeige.
 * In CI aus CI_COMMIT_TIMESTAMP, lokal aus Git; ohne beides die aktuelle Zeit verwenden.
 */
function formatAppBuildDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

function resolveAppBuildDate(): string {
  const ciTimestamp = process.env.CI_COMMIT_TIMESTAMP;
  if (ciTimestamp) {
    const parsed = new Date(ciTimestamp);
    if (!Number.isNaN(parsed.getTime())) {
      return formatAppBuildDate(parsed);
    }
  }
  try {
    const iso = execSync("git log -1 --format=%cI", { cwd: __dirname })
      .toString()
      .trim();
    const parsed = new Date(iso);
    if (!Number.isNaN(parsed.getTime())) {
      return formatAppBuildDate(parsed);
    }
  } catch {
    // Ohne Git-Zeitstempel das aktuelle Datum verwenden.
  }
  return formatAppBuildDate(new Date());
}

const APP_ICON_SRC = path.resolve(
  __dirname,
  "src/internal_assets/icons/Icon_AppIcon.png",
);
const APP_ICON_PUBLIC = path.resolve(__dirname, "public/Icon_AppIcon.png");

function copyAppIconPlugin(): Plugin {
  const sync = async () => {
    fs.copyFileSync(APP_ICON_SRC, APP_ICON_PUBLIC);
    await generatePwaIcons();
  };
  return {
    name: "copy-app-icon",
    buildStart: sync,
    configureServer: sync,
  };
}

function seoStaticFilesPlugin(env: Record<string, string>): Plugin {
  const siteUrl = resolveSeoSiteUrl(env);
  const allowIndexing = resolveSeoAllowIndexing(env);
  const apiBase = env.VITE_API_BASE_URL?.trim() ?? "";
  const strapiBase =
    env.VITE_STRAPI_BASE_URL?.trim() ||
    env.VITE_STRAPI_URL?.trim() ||
    apiBase;

  /** Lädt die statischen SEO-Dateien einmal pro Entwicklungsserver in den Speicher. */
  let cached: {
    robots: string;
    sitemap: string;
    llms: string;
  } | null = null;

  /** CMS-Metadaten in index.html für Crawler ohne JavaScript. */
  let shareMetaPromise: ReturnType<typeof fetchCmsShareMeta> | null = null;

  const ensureShareMeta = () => {
    if (!shareMetaPromise) {
      shareMetaPromise = fetchCmsShareMeta(apiBase, strapiBase);
    }
    return shareMetaPromise;
  };

  const defaultDescription =
    "Schwammtastisch: Verwandle Grau in Blau-Grün und entdecke spielerisch, wie das Schwammstadt-Prinzip Berlin kühler, grüner und lebenswerter macht.";

  const injectHtml = async (html: string) => {
    let out = html.replaceAll("__SITE_URL__", siteUrl);
    try {
      const meta = await ensureShareMeta();
      out = applyCmsShareMetaToHtml(out, meta, siteUrl, {
        defaultDescription,
      });
    } catch (error) {
      console.warn("[seo] index.html Share-Meta nicht injiziert:", error);
    }
    return out;
  };

  const ensureCached = async () => {
    if (cached) {
      return cached;
    }
    const tmpDir = path.resolve(__dirname, "node_modules/.cache/seo");
    await generateSeoFiles({
      outDir: tmpDir,
      siteUrl,
      allowIndexing,
      apiBase,
    });
    cached = {
      robots: fs.readFileSync(path.join(tmpDir, "robots.txt"), "utf8"),
      sitemap: fs.readFileSync(path.join(tmpDir, "sitemap.xml"), "utf8"),
      llms: fs.readFileSync(path.join(tmpDir, "llms.txt"), "utf8"),
    };
    return cached;
  };

  return {
    name: "seo-static-files",
    transformIndexHtml: {
      order: "post",
      async handler(html) {
        // Eigener Platzhalter, damit Vite bei fehlenden Umgebungsvariablen keine HTML-Warnung erzeugt.
        // CMS-Metadaten schon im HTML bereitstellen, damit Crawler ohne JavaScript sie lesen können.
        return injectHtml(html);
      },
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split("?")[0] ?? "";
        if (
          url !== "/robots.txt" &&
          url !== "/sitemap.xml" &&
          url !== "/llms.txt"
        ) {
          next();
          return;
        }
        try {
          const files = await ensureCached();
          const body =
            url === "/robots.txt"
              ? files.robots
              : url === "/sitemap.xml"
                ? files.sitemap
                : files.llms;
          const type =
            url === "/sitemap.xml" ? "application/xml" : "text/plain";
          res.statusCode = 200;
          res.setHeader("Content-Type", `${type}; charset=utf-8`);
          res.end(body);
        } catch (error) {
          next(error);
        }
      });
    },
    async writeBundle(outputOptions) {
      const outDir = outputOptions.dir
        ? path.resolve(outputOptions.dir)
        : path.resolve(__dirname, "dist");
      await generateSeoFiles({
        outDir,
        siteUrl,
        allowIndexing,
        apiBase,
      });
      // CMS-Metadaten erneut abrufen, falls der vorherige Transformationsaufruf fehlgeschlagen ist.
      shareMetaPromise = null;
      const indexPath = path.join(outDir, "index.html");
      if (fs.existsSync(indexPath)) {
        const html = fs.readFileSync(indexPath, "utf8");
        const next = await injectHtml(html);
        if (next !== html) {
          fs.writeFileSync(indexPath, next, "utf8");
        }
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  // Die zum aktuellen Vite-Modus gehörenden Umgebungsdateien laden.
  const env = loadEnv(mode, process.cwd(), "");
  const pwaDevServer = env.VITE_PWA_DEV === "true";
  const mkcertHttps = pwaDevServer ? loadMkcertHttps() : undefined;
  const useBasicSsl = pwaDevServer && !mkcertHttps;
  const strapiProxyTarget =
    env.VITE_STRAPI_PROXY_TARGET?.trim() || "http://127.0.0.1:1337";
  if (process.env.VITE_DEBUG_ENV === "1") {
    console.info(
      `[vite] mode=${mode} STRAPI=${env.VITE_STRAPI_BASE_URL ?? "(unset)"} proxy=${strapiProxyTarget}`,
    );
  }
  if (pwaDevServer) {
    console.info(`[vite] PWA-Dev: Strapi-Proxy → ${strapiProxyTarget}`);
  }

  return {
    envPrefix: ["VITE_", "DEV_"],
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "@/styles/variables" as *;\n`,
        },
      },
    },
    plugins: [
      ...(useBasicSsl ? [basicSsl()] : []),
      copyAppIconPlugin(),
      seoStaticFilesPlugin(env),
      tailwindcss(),
      react({
        babel: {
          plugins: [["babel-plugin-react-compiler", {}]],
        },
      }),
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: false,
        strategies: "injectManifest",
        srcDir: "src/pwa",
        filename: "sw.ts",
        manifest: false,
        devOptions: {
          enabled: pwaDevServer,
          type: "module",
        },
        injectManifest: {
          globPatterns: [
            "**/*.{js,css,html,ico,svg,webp,woff2,png,webmanifest}",
          ],
          maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        },
      }),
    ],
    define: {
      __APP_VERSION__: JSON.stringify(resolveAppVersion()),
      __APP_PKG_VERSION__: JSON.stringify(readPackageVersion()),
      __APP_BUILD_DATE__: JSON.stringify(resolveAppBuildDate()),
    },
    test: {
      environment: "node",
      include: ["src/**/*.test.ts"],
    },
    server: {
      ...(pwaDevServer
        ? {
            https: mkcertHttps ?? true,
          }
        : {}),
      proxy: {
        ...(pwaDevServer
          ? {
              "/api": {
                target: strapiProxyTarget,
                changeOrigin: true,
                secure: false,
              },
            }
          : {}),
        /** SVGs über dieselbe Origin abrufen und gemischte HTTP-/HTTPS-Inhalte vermeiden. */
        "/uploads": {
          target: strapiProxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
