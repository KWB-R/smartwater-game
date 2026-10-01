import type { StrapiApp } from '@strapi/strapi/admin';

export default {
  config: {
    locales: [
      // Weitere Sprachen bei Bedarf in locales ergänzen.

    ],
  },
  bootstrap(app: StrapiApp) {
    console.log(app);
  },
};
