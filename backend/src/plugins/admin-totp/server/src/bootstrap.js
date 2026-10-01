'use strict';

const path = require('path');
const compose = require('koa-compose');
const passport = require('koa-passport');

const totp = require(path.join(__dirname, '../../../../utils/totp.js'));

/**
 * Verlangt nach erfolgreicher Passwortprüfung einen TOTP-Code oder die Einrichtung von TOTP.
 */
function createTotpGate(strapi) {
  return async (ctx, next) => {
    const user = ctx.state.user;
    if (!user) {
      return next();
    }

    const credService = strapi.plugin('admin-totp').service('credential');
    const cred = await credService.findByAdminUserId(user.id);
    const required = credService.isTotpRequired();
    const enabled = cred?.enabled === true && Boolean(cred.secretEncrypted);

    const body = ctx.request.body || {};
    const inlineCode = typeof body.totpCode === 'string' ? body.totpCode.trim() : '';

    if (enabled) {
      if (inlineCode) {
        try {
          totp.assertTotpRateLimit(
            ctx.request?.ip || ctx.ip || 'unknown',
            String(user.id),
          );
        } catch {
          return ctx.tooManyRequests('Too many attempts');
        }
        let secret;
        try {
          secret = totp.decryptSecret(cred.secretEncrypted);
        } catch {
          return ctx.internalServerError('TOTP misconfigured');
        }
        const ok = await totp.verifyTotpCode(secret, inlineCode);
        if (!ok) {
          return ctx.badRequest('Invalid code');
        }
        return next();
      }

      const challengeToken = totp.issueChallengeToken(
        'admin',
        user.id,
        'totp_verify',
      );
      ctx.status = 200;
      ctx.body = {
        data: {
          totpRequired: true,
          challengeToken,
        },
      };
      return;
    }

    if (required) {
      const challengeToken = totp.issueChallengeToken(
        'admin',
        user.id,
        'totp_setup',
      );
      ctx.status = 200;
      ctx.body = {
        data: {
          setupRequired: true,
          challengeToken,
        },
      };
      return;
    }

    return next();
  };
}

module.exports = async ({ strapi }) => {
  const authController = strapi.controller('admin::authentication');
  if (!authController?.login) {
    strapi.log.warn('[admin-totp] admin::authentication.login not found');
    return;
  }

  const originalLogin = authController.login;
  const totpGate = createTotpGate(strapi);

  /**
   * Baut die Anmeldekette aus Validierung, Passport, TOTP-Prüfung und Token-Ausgabe auf.
   * Die TOTP-Prüfung muss vor der Ausgabe von Sitzungstoken erfolgen.
   */
  const loginValidation = async (ctx, next) => {
    const { errors } = require('@strapi/utils');
    const body = ctx.request.body ?? {};
    if (!body.email || !body.password) {
      throw new errors.ValidationError('email and password required');
    }
    return next();
  };

  const passportStep = (ctx, next) => {
    return passport.authenticate(
      'local',
      { session: false },
      (err, user, info) => {
        if (err) {
          strapi.eventHub.emit('admin.auth.error', {
            error: err,
            provider: 'local',
          });
          if (err.details?.code === 'LOGIN_NOT_ALLOWED') {
            throw err;
          }
          return ctx.notImplemented();
        }
        if (!user) {
          const { errors } = require('@strapi/utils');
          strapi.eventHub.emit('admin.auth.error', {
            error: new Error(info?.message || 'Invalid credentials'),
            provider: 'local',
          });
          throw new errors.ApplicationError(
            info?.message || 'Invalid credentials',
          );
        }
        ctx.state.user = user;
        const sanitizedUser = strapi.service('admin::user').sanitizeUser(user);
        strapi.eventHub.emit('admin.auth.success', {
          user: sanitizedUser,
          provider: 'local',
        });
        return next();
      },
    )(ctx, next);
  };

  const issueTokensStep = async (ctx) => {
    // Sitzungstoken erst nach erfolgreicher Passwort- und TOTP-Prüfung ausgeben.
    // Dafür denselben SessionManager wie Strapi verwenden.
    const crypto = require('crypto');
    const user = ctx.state.user;
    const sessionManager = strapi.sessionManager;
    if (!sessionManager) {
      return ctx.internalServerError();
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
      return ctx.internalServerError();
    }

    ctx.body = {
      data: {
        token: accessResult.token,
        accessToken: accessResult.token,
        user: strapi.service('admin::user').sanitizeUser(user),
      },
    };
  };

  // Der Setter ersetzt das Ziel des Proxys aus register(); die bereits gebundene Route bleibt gültig.
  authController.login = compose([
    loginValidation,
    passportStep,
    totpGate,
    issueTokensStep,
  ]);

  void originalLogin;

  strapi.log.info('[admin-totp] wrapped admin login with TOTP gate');
};
