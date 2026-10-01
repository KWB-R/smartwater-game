import type { Core } from "@strapi/strapi";

const config = ({
  env,
}: Core.Config.Shared.ConfigParams): Core.Config.Server => {
  const publicUrl = env("PUBLIC_URL", "").trim();

  return {
    host: env("HOST", "0.0.0.0"),
    port: env.int("PORT", 1337),
    app: {
      keys: env.array("APP_KEYS"),
    },
    proxy: env.bool("BEHIND_PROXY", false) ? { koa: true } : false,
    // PUBLIC_URL nur hinter einem Proxy setzen. Ohne feste URL verwendet Strapi den Host der Anfrage.
    ...(publicUrl ? { url: publicUrl } : {}),
  };
};

export default config;
