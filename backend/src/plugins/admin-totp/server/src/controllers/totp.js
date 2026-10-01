'use strict';

const crypto = require('crypto');
const path = require('path');

const totp = require(path.join(__dirname, '../../../../../utils/totp.js'));

const CREDENTIAL_UID = 'plugin::admin-totp.admin-totp-credential';

function readString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function clientIp(ctx) {
  return ctx.request?.ip || ctx.ip || 'unknown';
}

async function issueAdminTokens(strapi, ctx, user) {
  const sessionManager = strapi.sessionManager;
  if (!sessionManager) {
    throw new Error('Session manager unavailable');
  }

  const userId = String(user.id);
  const body = ctx.request.body || {};
  const deviceId =
    typeof body.deviceId === 'string' && body.deviceId
      ? body.deviceId
      : crypto.randomUUID();
  const rememberMe = Boolean(body.rememberMe);

  const { token: refreshToken, absoluteExpiresAt } = await sessionManager(
    'admin',
  ).generateRefreshToken(userId, deviceId, {
    type: rememberMe ? 'refresh' : 'session',
  });

  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction && Boolean(ctx.request.secure),
    overwrite: true,
    path: strapi.config.get('admin.auth.cookie.path', '/admin'),
    domain:
      strapi.config.get('admin.auth.cookie.domain') ||
      strapi.config.get('admin.auth.domain'),
    sameSite: strapi.config.get('admin.auth.cookie.sameSite') ?? 'lax',
  };

  if (rememberMe && absoluteExpiresAt) {
    const expires = new Date(absoluteExpiresAt);
    cookieOptions.expires = expires;
    cookieOptions.maxAge = Math.max(0, expires.getTime() - Date.now());
  }

  ctx.cookies.set('strapi_admin_refresh', refreshToken, cookieOptions);

  const accessResult = await sessionManager('admin').generateAccessToken(
    refreshToken,
  );
  if ('error' in accessResult) {
    throw new Error('Failed to generate access token');
  }

  const userService = strapi.service('admin::user');
  return {
    token: accessResult.token,
    accessToken: accessResult.token,
    user: userService.sanitizeUser(user),
  };
}

async function loadAdminUser(strapi, userId) {
  return strapi.db.query('admin::user').findOne({
    where: { id: userId },
    populate: ['roles'],
  });
}

module.exports = {
  async verify(ctx) {
    const body = ctx.request.body || {};
    const challengeToken = readString(body.challengeToken);
    const code = readString(body.code || body.totpCode);

    if (!challengeToken || !code) {
      return ctx.badRequest('Challenge and code required');
    }

    let userId;
    try {
      ({ userId } = totp.verifyChallengeToken(
        'admin',
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

    const credService = strapi.plugin('admin-totp').service('credential');
    const cred = await credService.findByAdminUserId(userId);
    if (!cred?.enabled || !cred.secretEncrypted) {
      return ctx.unauthorized('Invalid or expired challenge');
    }

    let secret;
    try {
      secret = totp.decryptSecret(cred.secretEncrypted);
    } catch {
      return ctx.internalServerError('TOTP misconfigured');
    }

    const ok = await totp.verifyTotpCode(secret, code);
    if (!ok) {
      return ctx.badRequest('Invalid code');
    }

    const user = await loadAdminUser(strapi, userId);
    if (!user || user.isActive === false || user.blocked === true) {
      return ctx.unauthorized('Invalid credentials');
    }

    try {
      const data = await issueAdminTokens(strapi, ctx, user);
      ctx.body = { data };
    } catch (error) {
      strapi.log.error('[admin-totp] verify token issue failed', error);
      return ctx.internalServerError();
    }
  },

  async status(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized();
    }
    const credService = strapi.plugin('admin-totp').service('credential');
    const cred = await credService.findByAdminUserId(user.id);
    ctx.body = {
      data: {
        enabled: cred?.enabled === true,
        required: credService.isTotpRequired(),
      },
    };
  },

  async setup(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized();
    }

    const secret = totp.createTotpSecret();
    const label = user.email || String(user.id);
    const otpauthUrl = totp.buildOtpauthUrl(secret, label, 'Smartwater Admin');
    const qrDataUrl = await totp.buildQrDataUrl(otpauthUrl);

    const credService = strapi.plugin('admin-totp').service('credential');
    await credService.upsertPending(user.id, secret);

    ctx.body = {
      data: {
        otpauthUrl,
        qrDataUrl,
        secret,
      },
    };
  },

  async confirm(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized();
    }

    const code = readString((ctx.request.body || {}).code);
    if (!code) {
      return ctx.badRequest('Code required');
    }

    try {
      totp.assertTotpRateLimit(clientIp(ctx), String(user.id));
    } catch {
      return ctx.tooManyRequests('Too many attempts');
    }

    const cred = await strapi.db.query(CREDENTIAL_UID).findOne({
      where: { adminUserId: String(user.id) },
    });
    if (!cred?.pendingSecretEncrypted) {
      return ctx.badRequest('Setup not started');
    }

    let secret;
    try {
      secret = totp.decryptSecret(cred.pendingSecretEncrypted);
    } catch {
      return ctx.internalServerError('TOTP misconfigured');
    }

    const ok = await totp.verifyTotpCode(secret, code);
    if (!ok) {
      return ctx.badRequest('Invalid code');
    }

    const credService = strapi.plugin('admin-totp').service('credential');
    await credService.confirmEnable(user.id, secret);

    ctx.body = { data: { enabled: true } };
  },

  async disable(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized();
    }

    const code = readString((ctx.request.body || {}).code);
    if (!code) {
      return ctx.badRequest('Code required');
    }

    try {
      totp.assertTotpRateLimit(clientIp(ctx), String(user.id));
    } catch {
      return ctx.tooManyRequests('Too many attempts');
    }

    const credService = strapi.plugin('admin-totp').service('credential');
    const cred = await credService.findByAdminUserId(user.id);
    if (!cred?.enabled || !cred.secretEncrypted) {
      return ctx.badRequest('TOTP not enabled');
    }

    let secret;
    try {
      secret = totp.decryptSecret(cred.secretEncrypted);
    } catch {
      return ctx.internalServerError('TOTP misconfigured');
    }

    const ok = await totp.verifyTotpCode(secret, code);
    if (!ok) {
      return ctx.badRequest('Invalid code');
    }

    await credService.disable(user.id);
    ctx.body = { data: { enabled: false } };
  },

  /**
   * Richtet TOTP während der Anmeldung ein, bevor eine Admin-Sitzung besteht.
   */
  async setupWithChallenge(ctx) {
    const body = ctx.request.body || {};
    const challengeToken = readString(body.challengeToken);
    if (!challengeToken) {
      return ctx.badRequest('Challenge required');
    }

    let userId;
    try {
      ({ userId } = totp.verifyChallengeToken(
        'admin',
        challengeToken,
        'totp_setup',
      ));
    } catch {
      return ctx.unauthorized('Invalid or expired challenge');
    }

    const user = await loadAdminUser(strapi, userId);
    if (!user || user.isActive === false || user.blocked === true) {
      return ctx.unauthorized('Invalid credentials');
    }

    const secret = totp.createTotpSecret();
    const label = user.email || String(user.id);
    const otpauthUrl = totp.buildOtpauthUrl(secret, label, 'Smartwater Admin');
    const qrDataUrl = await totp.buildQrDataUrl(otpauthUrl);

    const credService = strapi.plugin('admin-totp').service('credential');
    await credService.upsertPending(user.id, secret);

    const nextChallenge = totp.issueChallengeToken(
      'admin',
      user.id,
      'totp_setup',
    );

    ctx.body = {
      data: {
        challengeToken: nextChallenge,
        otpauthUrl,
        qrDataUrl,
        secret,
      },
    };
  },

  async confirmWithChallenge(ctx) {
    const body = ctx.request.body || {};
    const challengeToken = readString(body.challengeToken);
    const code = readString(body.code);

    if (!challengeToken || !code) {
      return ctx.badRequest('Challenge and code required');
    }

    let userId;
    try {
      ({ userId } = totp.verifyChallengeToken(
        'admin',
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

    const cred = await strapi.db.query(CREDENTIAL_UID).findOne({
      where: { adminUserId: String(userId) },
    });
    if (!cred?.pendingSecretEncrypted) {
      return ctx.badRequest('Setup not started');
    }

    let secret;
    try {
      secret = totp.decryptSecret(cred.pendingSecretEncrypted);
    } catch {
      return ctx.internalServerError('TOTP misconfigured');
    }

    const ok = await totp.verifyTotpCode(secret, code);
    if (!ok) {
      return ctx.badRequest('Invalid code');
    }

    const credService = strapi.plugin('admin-totp').service('credential');
    await credService.confirmEnable(userId, secret);

    const user = await loadAdminUser(strapi, userId);
    if (!user) {
      return ctx.unauthorized('Invalid credentials');
    }

    try {
      const data = await issueAdminTokens(strapi, ctx, user);
      ctx.body = { data };
    } catch (error) {
      strapi.log.error('[admin-totp] confirm token issue failed', error);
      return ctx.internalServerError();
    }
  },
};
