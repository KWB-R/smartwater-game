/**
 * Standard-CRUD-Routen deaktivieren; eigene Endpunkte stehen in 01-custom-analytics-counter.ts.
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter(
  'api::analytics-counter.analytics-counter',
  {
    only: [],
  },
);
