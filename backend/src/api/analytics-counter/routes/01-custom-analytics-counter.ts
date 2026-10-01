/**
 * Öffentliche Ereigniserfassung; Auswertung und Zurücksetzen erfordern eine Anmeldung.
 * type: 'content-api' sorgt dafür, dass diese Routen unter /api erreichbar sind.
 */

export default {
  type: 'content-api' as const,
  routes: [
    {
      method: 'POST',
      path: '/analytics/track',
      handler: 'api::analytics-counter.analytics-counter.track',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/analytics/summary',
      handler: 'api::analytics-counter.analytics-counter.summary',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/analytics/reset',
      handler: 'api::analytics-counter.analytics-counter.reset',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
