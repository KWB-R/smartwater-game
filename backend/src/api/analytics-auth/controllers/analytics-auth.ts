/**
 * Anmeldung für die Statistikauswertung mit Passwort und TOTP über Users-Permissions.
 */

import { factories } from '@strapi/strapi';

// Gemeinsame CommonJS-Hilfsfunktionen für die Statistik-API und das Admin-Plugin.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const totp = require('../../../utils/totp') as typeof import('../../../utils/totp');

const UID = 'api::analytics-auth.analytics-auth' as any;
const USER_UID = 'plugin::users-permissions.user' as const;

type AuthBody = {
  identifier?: unknown;
  password?: unknown;
  challengeToken?: unknown;
  code?: unknown;
};

function clientIp(ctx: {
  request?: { ip?: string };
  ip?: string;
}): string {
  return ctx.request?.ip || ctx.ip || 'unknown';
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

async function findLocalUser(strapiInstance: any, identifier: string) {
  return strapiInstance.db.query(USER_UID).findOne({
    where: {
      provider: 'local',
      $or: [{ email: identifier.toLowerCase() }, { username: identifier }],
    },
  });
}

async function sanitizeUser(strapiInstance: any, user: any, ctx: any) {
  const userSchema = strapiInstance.getModel(USER_UID);
  return strapiInstance.contentAPI.sanitize.output(user, userSchema, {
    auth: ctx.state.auth,
  });
}

async function issueUserJwt(strapiInstance: any, user: { id: number | string }) {
  const jwtService = strapiInstance.plugin('users-permissions').service('jwt');
  return jwtService.issue({ id: user.id });
}

async function validatePassword(
  strapiInstance: any,
  plain: string,
  hash: string,
): Promise<boolean> {
  return strapiInstance
    .plugin('users-permissions')
    .service('user')
    .validatePassword(plain, hash);
}

export default factories.createCoreController(UID, ({ strapi }) => ({
  async login(ctx) {
    const body = (ctx.request.body || {}) as AuthBody;
    const identifier = readString(body.identifier);
    const password = readString(body.password);

    if (!identifier || !password) {
      return ctx.badRequest('Identifier and password required');
    }

    const user = await findLocalUser(strapi, identifier);
    if (!user?.password) {
      return ctx.badRequest('Invalid identifier or password');
    }

    const valid = await validatePassword(strapi, password, user.password);
    if (!valid) {
      return ctx.badRequest('Invalid identifier or password');
    }

    if (user.blocked === true) {
      return ctx.forbidden('User blocked');
    }

    if (user.totpEnabled === true && user.totpSecret) {
      const challengeToken = totp.issueChallengeToken(
        'analytics',
        user.id,
        'totp_verify',
      );
      ctx.body = {
        status: 'totp_required',
        challengeToken,
      };
      return;
    }

    const challengeToken = totp.issueChallengeToken(
      'analytics',
      user.id,
      'totp_setup',
    );
    ctx.body = {
      status: 'setup_required',
      challengeToken,
    };
  },

  async verifyTotp(ctx) {
    const body = (ctx.request.body || {}) as AuthBody;
    const challengeToken = readString(body.challengeToken);
    const code = readString(body.code);

    if (!challengeToken || !code) {
      return ctx.badRequest('Challenge and code required');
    }

    let userId: string;
    try {
      ({ userId } = totp.verifyChallengeToken(
        'analytics',
        challengeToken,
        'totp_verify',
      ));
    } catch {
      return ctx.unauthorized('Invalid or expired challenge');
    }

    try {
      totp.assertTotpRateLimit(clientIp(ctx), userId);
    } catch {
      return ctx.tooManyRequests('Too many attempts');
    }

    const user = await strapi.db.query(USER_UID).findOne({
      where: { id: userId },
    });
    if (!user?.totpEnabled || !user.totpSecret) {
      return ctx.unauthorized('Invalid or expired challenge');
    }

    let secret: string;
    try {
      secret = totp.decryptSecret(user.totpSecret);
    } catch {
      return ctx.internalServerError('TOTP misconfigured');
    }

    const ok = await totp.verifyTotpCode(secret, code);
    if (!ok) {
      return ctx.badRequest('Invalid code');
    }

    const jwt = await issueUserJwt(strapi, user);
    const sanitized = await sanitizeUser(strapi, user, ctx);
    ctx.body = {
      status: 'authenticated',
      jwt,
      user: sanitized,
    };
  },

  async setupTotp(ctx) {
    const body = (ctx.request.body || {}) as AuthBody;
    const challengeToken = readString(body.challengeToken);

    if (!challengeToken) {
      return ctx.badRequest('Challenge required');
    }

    let userId: string;
    try {
      ({ userId } = totp.verifyChallengeToken(
        'analytics',
        challengeToken,
        'totp_setup',
      ));
    } catch {
      return ctx.unauthorized('Invalid or expired challenge');
    }

    const user = await strapi.db.query(USER_UID).findOne({
      where: { id: userId },
    });
    if (!user || user.blocked === true) {
      return ctx.unauthorized('Invalid or expired challenge');
    }
    if (user.totpEnabled === true) {
      return ctx.badRequest('TOTP already enabled');
    }

    const secret = totp.createTotpSecret();
    const label = user.email || user.username || String(user.id);
    const otpauthUrl = totp.buildOtpauthUrl(
      secret,
      label,
      'Smartwater Analytics',
    );
    const qrDataUrl = await totp.buildQrDataUrl(otpauthUrl);

    await strapi.db.query(USER_UID).update({
      where: { id: user.id },
      data: {
        totpPendingSecret: totp.encryptSecret(secret),
      },
    });

    const nextChallenge = totp.issueChallengeToken(
      'analytics',
      user.id,
      'totp_setup',
    );

    ctx.body = {
      status: 'setup',
      challengeToken: nextChallenge,
      otpauthUrl,
      qrDataUrl,
      secret,
    };
  },

  async confirmTotp(ctx) {
    const body = (ctx.request.body || {}) as AuthBody;
    const challengeToken = readString(body.challengeToken);
    const code = readString(body.code);

    if (!challengeToken || !code) {
      return ctx.badRequest('Challenge and code required');
    }

    let userId: string;
    try {
      ({ userId } = totp.verifyChallengeToken(
        'analytics',
        challengeToken,
        'totp_setup',
      ));
    } catch {
      return ctx.unauthorized('Invalid or expired challenge');
    }

    try {
      totp.assertTotpRateLimit(clientIp(ctx), userId);
    } catch {
      return ctx.tooManyRequests('Too many attempts');
    }

    const user = await strapi.db.query(USER_UID).findOne({
      where: { id: userId },
    });
    if (!user?.totpPendingSecret) {
      return ctx.badRequest('Setup not started');
    }

    let secret: string;
    try {
      secret = totp.decryptSecret(user.totpPendingSecret);
    } catch {
      return ctx.internalServerError('TOTP misconfigured');
    }

    const ok = await totp.verifyTotpCode(secret, code);
    if (!ok) {
      return ctx.badRequest('Invalid code');
    }

    const updated = await strapi.db.query(USER_UID).update({
      where: { id: user.id },
      data: {
        totpSecret: totp.encryptSecret(secret),
        totpEnabled: true,
        totpPendingSecret: null,
      },
    });

    const jwt = await issueUserJwt(strapi, updated);
    const sanitized = await sanitizeUser(strapi, updated, ctx);
    ctx.body = {
      status: 'authenticated',
      jwt,
      user: sanitized,
    };
  },
}));
