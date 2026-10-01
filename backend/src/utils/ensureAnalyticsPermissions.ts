import type { Core } from '@strapi/strapi';

const TRACK_ACTION = 'api::analytics-counter.analytics-counter.track';
const SUMMARY_ACTION = 'api::analytics-counter.analytics-counter.summary';
const RESET_ACTION = 'api::analytics-counter.analytics-counter.reset';

const AUTH_LOGIN_ACTION = 'api::analytics-auth.analytics-auth.login';
const AUTH_TOTP_ACTION = 'api::analytics-auth.analytics-auth.verifyTotp';
const AUTH_SETUP_ACTION = 'api::analytics-auth.analytics-auth.setupTotp';
const AUTH_CONFIRM_ACTION = 'api::analytics-auth.analytics-auth.confirmTotp';

async function ensureRolePermission(
  strapi: Core.Strapi,
  roleType: 'public' | 'authenticated',
  action: string,
) {
  const role = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: roleType } });

  if (!role) {
    strapi.log.warn(
      `users-permissions role "${roleType}" missing — skip ${action}`,
    );
    return;
  }

  const existing = await strapi.db
    .query('plugin::users-permissions.permission')
    .findOne({
      where: {
        action,
        role: role.id,
      },
    });

  if (existing) {
    return;
  }

  await strapi.db.query('plugin::users-permissions.permission').create({
    data: {
      action,
      role: role.id,
    },
  });

  strapi.log.info(`Granted ${action} to role ${roleType}`);
}

/** Öffentlich: Ereigniserfassung und TOTP-Anmeldung. Angemeldet: Auswertung und Zurücksetzen. */
export async function ensureAnalyticsPermissions(strapi: Core.Strapi) {
  await ensureRolePermission(strapi, 'public', TRACK_ACTION);
  await ensureRolePermission(strapi, 'public', AUTH_LOGIN_ACTION);
  await ensureRolePermission(strapi, 'public', AUTH_TOTP_ACTION);
  await ensureRolePermission(strapi, 'public', AUTH_SETUP_ACTION);
  await ensureRolePermission(strapi, 'public', AUTH_CONFIRM_ACTION);
  await ensureRolePermission(strapi, 'authenticated', SUMMARY_ACTION);
  await ensureRolePermission(strapi, 'authenticated', RESET_ACTION);
}
