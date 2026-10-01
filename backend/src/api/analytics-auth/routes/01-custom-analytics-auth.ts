/**
 * Öffentliche Endpunkte für die Anmeldung zur Statistikauswertung.
 */

export default {
  type: 'content-api' as const,
  routes: [
    {
      method: 'POST',
      path: '/analytics/auth/login',
      handler: 'api::analytics-auth.analytics-auth.login',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/analytics/auth/totp',
      handler: 'api::analytics-auth.analytics-auth.verifyTotp',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/analytics/auth/totp/setup',
      handler: 'api::analytics-auth.analytics-auth.setupTotp',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/analytics/auth/totp/confirm',
      handler: 'api::analytics-auth.analytics-auth.confirmTotp',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
