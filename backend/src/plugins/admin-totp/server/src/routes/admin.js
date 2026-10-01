'use strict';

module.exports = {
  type: 'admin',
  routes: [
    {
      method: 'POST',
      path: '/totp/verify',
      handler: 'totp.verify',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/totp/setup-challenge',
      handler: 'totp.setupWithChallenge',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/totp/confirm-challenge',
      handler: 'totp.confirmWithChallenge',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/totp/status',
      handler: 'totp.status',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'POST',
      path: '/totp/setup',
      handler: 'totp.setup',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'POST',
      path: '/totp/confirm',
      handler: 'totp.confirm',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'POST',
      path: '/totp/disable',
      handler: 'totp.disable',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
  ],
};
