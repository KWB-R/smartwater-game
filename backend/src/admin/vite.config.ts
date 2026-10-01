import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { Plugin } from 'vite';
import { mergeConfig, type UserConfig } from 'vite';

const allowedHosts = process.env.ALLOWED_HOSTS
  ? process.env.ALLOWED_HOSTS.split(',').map((h) => h.trim()).filter(Boolean)
  : [];

const isDev = process.env.NODE_ENV !== 'production';

const totpLoginPath = path.resolve(__dirname, './extensions/TotpLogin.jsx');

/** Invalidiert den optimizeDeps-Cache bei Änderungen an TotpLogin.jsx, damit der Alias aktuell bleibt. */
const totpLoginBust = crypto
  .createHash('sha1')
  .update(fs.readFileSync(totpLoginPath))
  .digest('hex')
  .slice(0, 12);

const stockLoginFiles = [
  path.resolve(
    __dirname,
    '../../node_modules/@strapi/admin/dist/admin/admin/src/pages/Auth/components/Login.js',
  ),
  path.resolve(
    __dirname,
    '../../node_modules/@strapi/admin/dist/admin/admin/src/pages/Auth/components/Login.mjs',
  ),
].filter((filePath) => fs.existsSync(filePath));

function normalize(id: string) {
  return id.replace(/\\/g, '/');
}

function shouldReplaceLogin(source: string, importer?: string) {
  const src = normalize(source);
  if (src.endsWith('Auth/components/Login.js') || src.endsWith('Auth/components/Login.mjs')) {
    return true;
  }
  if (src.endsWith('Auth/components/Login')) {
    return true;
  }
  if (
    importer &&
    /pages\/Auth\/AuthPage\.(js|mjs|jsx|tsx)$/.test(normalize(importer)) &&
    /(^|\/)components\/Login(\.(js|mjs))?$/.test(src)
  ) {
    return true;
  }
  return false;
}

function replaceAdminLoginPlugin(): Plugin {
  return {
    name: 'strapi-admin-totp-login',
    enforce: 'pre',
    resolveId(source, importer) {
      if (shouldReplaceLogin(source, importer)) {
        return totpLoginPath;
      }
      return null;
    },
  };
}

function replaceAdminLoginEsbuildPlugin() {
  return {
    name: 'strapi-admin-totp-login-esbuild',
    setup(build: {
      onResolve: (
        options: { filter: RegExp },
        callback: (args: { path: string; importer: string }) =>
          | { path: string }
          | undefined,
      ) => void;
    }) {
      build.onResolve({ filter: /Login(\.(js|mjs))?$/ }, (args) => {
        if (shouldReplaceLogin(args.path, args.importer)) {
          return { path: totpLoginPath };
        }
        return undefined;
      });
    },
  };
}

export default (config: UserConfig) => {
  const server =
    isDev
      ? { allowedHosts: true as const }
      : allowedHosts.length > 0
        ? { allowedHosts }
        : undefined;

  const absoluteAliases = Object.fromEntries(
    stockLoginFiles.map((filePath) => [filePath, totpLoginPath]),
  );

  return mergeConfig(config, {
    plugins: [replaceAdminLoginPlugin()],
    define: {
      // Der Dateihash erneuert browserHash, sobald sich die Anmeldeseite ändert.
      __SW_TOTP_LOGIN_BUST__: JSON.stringify(totpLoginBust),
    },
    resolve: {
      alias: {
        ...absoluteAliases,
        '@': path.resolve(__dirname, '..'),
      },
    },
    optimizeDeps: {
      // sanitize-html vorab bündeln, damit der Anmelde-Alias kein unverarbeitetes CommonJS/PostCSS lädt.
      include: ['sanitize-html'],
      esbuildOptions: {
        plugins: [replaceAdminLoginEsbuildPlugin()],
      },
    },
    ...(server && { server }),
  });
};
