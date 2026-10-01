/**
 * Leerer Service für die von Strapi erwartete API-Struktur.
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService(
  'api::analytics-auth.analytics-auth' as any,
);
