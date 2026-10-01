/**
 * Startet bei Bedarf vite preview und prüft die Kernrouten mit Unlighthouse.
 *
 * Aufruf:
 *   pnpm unlighthouse:core
 *   pnpm unlighthouse:core -- --skip-build
 *   pnpm unlighthouse:core -- --desktop
 *   pnpm unlighthouse:core -- --site https://staging.example
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CORE_ROUTES,
  PREVIEW_HOST,
  PREVIEW_PORT,
  PREVIEW_SITE,
} from "./coreRoutes.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const distIndex = path.join(root, "dist", "index.html");

const args = new Set(process.argv.slice(2));
const skipBuild = args.has("--skip-build");
const desktop = args.has("--desktop");
const siteArgIdx = process.argv.indexOf("--site");
const siteOverride =
  siteArgIdx >= 0 ? process.argv[siteArgIdx + 1]?.trim() : undefined;
const remoteSite = Boolean(siteOverride);
const site = siteOverride || PREVIEW_SITE;

/** @type {import('node:child_process').ChildProcess | null} */
let previewChild = null;
let stopping = false;

function log(msg) {
  console.log(`[unlighthouse:core] ${msg}`);
}

function run(command, commandArgs, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: root,
      stdio: "inherit",
      shell: true,
      env: process.env,
      ...options,
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${command} beendet durch Signal ${signal}`));
        return;
      }
      if (code !== 0) {
        reject(new Error(`${command} exit ${code}`));
        return;
      }
      resolve();
    });
  });
}

async function isReachable(url) {
  try {
    const res = await fetch(url, { redirect: "manual" });
    return res.status > 0 && res.status < 500;
  } catch {
    return false;
  }
}

async function waitForSite(url, { timeoutMs = 60_000, intervalMs = 500 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isReachable(url)) return;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Timeout: ${url} nicht erreichbar nach ${timeoutMs}ms`);
}

async function ensurePreview() {
  if (await isReachable(site)) {
    log(`Preview schon da: ${site}`);
    return;
  }

  if (!skipBuild && !fs.existsSync(distIndex)) {
    log("dist fehlt → pnpm build");
    await run("pnpm", ["run", "build"]);
  } else if (!skipBuild) {
    log("pnpm build (frischer Prod-Build)");
    await run("pnpm", ["run", "build"]);
  } else if (!fs.existsSync(distIndex)) {
    throw new Error("dist/index.html fehlt — ohne --skip-build bauen oder zuerst pnpm build");
  }

  log(`Starte preview auf ${PREVIEW_HOST}:${PREVIEW_PORT}`);
  previewChild = spawn(
    "pnpm",
    [
      "exec",
      "vite",
      "preview",
      "--mode",
      "production",
      "--host",
      PREVIEW_HOST,
      "--port",
      String(PREVIEW_PORT),
      "--strictPort",
    ],
    {
      cwd: root,
      stdio: ["ignore", "inherit", "inherit"],
      shell: true,
      env: process.env,
    },
  );

  previewChild.on("exit", (code, signal) => {
    if (!stopping && code !== 0 && code !== null) {
      console.error(
        `[unlighthouse:core] preview gestorben (code=${code}, signal=${signal})`,
      );
    }
  });

  await waitForSite(site);
  log("Preview bereit");
}

async function stopPreview() {
  if (!previewChild || previewChild.killed) return;
  stopping = true;
  log("Stoppe preview…");
  const child = previewChild;
  previewChild = null;

  if (process.platform === "win32" && child.pid) {
    await new Promise((resolve) => {
      const killer = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        shell: true,
      });
      killer.on("exit", () => resolve());
      killer.on("error", () => {
        child.kill();
        resolve();
      });
    });
    return;
  }

  child.kill("SIGTERM");
  await new Promise((resolve) => {
    const t = setTimeout(() => {
      child.kill("SIGKILL");
      resolve();
    }, 3000);
    child.on("exit", () => {
      clearTimeout(t);
      resolve();
    });
  });
}

async function runUnlighthouse() {
  const urls = CORE_ROUTES.join(",");
  const unlighthouseArgs = [
    "exec",
    "unlighthouse",
    "--debug",
    "--site",
    site,
    "--urls",
    urls,
    "--disable-sitemap",
    "--disable-robots-txt",
  ];
  if (desktop) unlighthouseArgs.push("--desktop");

  log(`Scan Kernrouten (${CORE_ROUTES.length}): ${CORE_ROUTES.join(", ")}`);
  log(`Site: ${site}${desktop ? " [desktop]" : " [mobile]"}`);
  await run("pnpm", unlighthouseArgs);
}

async function main() {
  const cleanup = async () => {
    await stopPreview();
  };
  process.on("SIGINT", () => {
    void cleanup().finally(() => process.exit(130));
  });
  process.on("SIGTERM", () => {
    void cleanup().finally(() => process.exit(143));
  });

  try {
    if (!remoteSite) {
      await ensurePreview();
    } else {
      log(`Remote site: ${site} (kein lokales preview)`);
      await waitForSite(site, { timeoutMs: 15_000 });
    }
    await runUnlighthouse();
  } finally {
    await cleanup();
  }
}

main().catch(async (err) => {
  console.error(`[unlighthouse:core] ${err instanceof Error ? err.message : err}`);
  await stopPreview();
  process.exit(1);
});
