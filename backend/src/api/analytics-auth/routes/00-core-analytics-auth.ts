/**
 * Standard-CRUD-Routen deaktivieren; die Anmeldung verwendet eigene Routen.
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter(
  'api::analytics-auth.analytics-auth' as any,
  {
    only: [],
  },
);
