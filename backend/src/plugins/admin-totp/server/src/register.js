'use strict';

/**
 * Installiert einen austauschbaren Anmelde-Proxy, bevor Strapi die Routen bindet.
 * bootstrap ersetzt später dessen Implementierung; die Route ruft weiterhin den Proxy auf.
 */
module.exports = ({ strapi }) => {
  const authController = strapi.controller('admin::authentication');
  if (!authController?.login) {
    strapi.log.warn('[admin-totp] admin::authentication.login not found at register');
    return;
  }

  let loginImpl = authController.login;

  Object.defineProperty(authController, 'login', {
    configurable: true,
    enumerable: true,
    get() {
      return function adminTotpLoginProxy(...args) {
        return loginImpl.apply(this, args);
      };
    },
    set(fn) {
      loginImpl = fn;
    },
  });

  strapi.log.info('[admin-totp] plugin registered (login proxy installed)');
};
