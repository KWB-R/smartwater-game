'use strict';

/**
 * Gemeinsame TOTP-Hilfsfunktionen für Statistik und Admin-Panel.
 * CommonJS ermöglicht die Nutzung im Admin-Plugin und in den TypeScript-APIs.
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { generateSecret, generateURI, verify } = require('otplib');
const QRCode = require('qrcode');

const CHALLENGE_TTL_SEC = 5 * 60;
const TOTP_EPOCH_TOLERANCE = 30;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 10;

/** @type {Map<string, number[]>} */
const rateBuckets = new Map();

/**
 * @param {string} key
 * @returns {boolean} true, wenn das Limit erreicht ist.
 */
function isRateLimited(key) {
  const now = Date.now();
  const prev = rateBuckets.get(key) ?? [];
  const recent = prev.filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX) {
    rateBuckets.set(key, recent);
    return true;
  }
  recent.push(now);
  rateBuckets.set(key, recent);
  return false;
}

/**
 * @returns {Buffer}
 */
function encryptionKeyBytes() {
  const raw = process.env.ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error('ENCRYPTION_KEY is not set');
  }
  // Base64-Schlüssel direkt verwenden; sonst aus der Zeichenkette einen SHA-256-Schlüssel ableiten.
  let key;
  try {
    key = Buffer.from(raw, 'base64');
  } catch {
    key = Buffer.alloc(0);
  }
  if (key.length !== 32) {
    key = crypto.createHash('sha256').update(raw).digest();
  }
  return key;
}

/**
 * @param {string} plaintext
 * @returns {string}
 */
function encryptSecret(plaintext) {
  const key = encryptionKeyBytes();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

/**
 * @param {string} payload
 * @returns {string}
 */
function decryptSecret(payload) {
  const parts = String(payload || '').split(':');
  if (parts.length !== 4 || parts[0] !== 'v1') {
    throw new Error('Invalid encrypted secret');
  }
  const [, ivB64, tagB64, dataB64] = parts;
  const key = encryptionKeyBytes();
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivB64, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

/**
 * @param {'analytics' | 'admin'} audience
 * @param {string | number} userId
 * @param {'totp_verify' | 'totp_setup'} intent
 * @returns {string}
 */
function issueChallengeToken(audience, userId, intent) {
  const secret =
    audience === 'admin'
      ? process.env.ADMIN_JWT_SECRET
      : process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      audience === 'admin'
        ? 'ADMIN_JWT_SECRET is not set'
        : 'JWT_SECRET is not set',
    );
  }
  return jwt.sign(
    {
      purpose: 'totp-challenge',
      audience,
      intent,
      sub: String(userId),
    },
    secret,
    { expiresIn: CHALLENGE_TTL_SEC },
  );
}

/**
 * @param {'analytics' | 'admin'} audience
 * @param {string} token
 * @param {'totp_verify' | 'totp_setup'} [expectedIntent]
 * @returns {{ userId: string, intent: string }}
 */
function verifyChallengeToken(audience, token, expectedIntent) {
  const secret =
    audience === 'admin'
      ? process.env.ADMIN_JWT_SECRET
      : process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Challenge secret missing');
  }
  const payload = jwt.verify(token, secret);
  if (
    !payload ||
    typeof payload !== 'object' ||
    payload.purpose !== 'totp-challenge' ||
    payload.audience !== audience ||
    !payload.sub
  ) {
    throw new Error('Invalid challenge');
  }
  if (expectedIntent && payload.intent !== expectedIntent) {
    throw new Error('Invalid challenge intent');
  }
  return {
    userId: String(payload.sub),
    intent: String(payload.intent),
  };
}

function createTotpSecret() {
  return generateSecret();
}

/**
 * @param {string} secret
 * @param {string} label
 * @param {string} [issuer]
 */
function buildOtpauthUrl(secret, label, issuer = 'Smartwater') {
  return generateURI({
    issuer,
    label,
    secret,
  });
}

/**
 * @param {string} otpauthUrl
 * @returns {Promise<string>}
 */
async function buildQrDataUrl(otpauthUrl) {
  return QRCode.toDataURL(otpauthUrl, { margin: 1, width: 220 });
}

/**
 * @param {string} secret
 * @param {string} code
 * @returns {Promise<boolean>}
 */
async function verifyTotpCode(secret, code) {
  const normalized = String(code || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(normalized)) {
    return false;
  }
  const result = await verify({
    secret,
    token: normalized,
    epochTolerance: TOTP_EPOCH_TOLERANCE,
  });
  return Boolean(result?.valid);
}

/**
 * @param {string} ipOrKey
 * @param {string} userId
 */
function assertTotpRateLimit(ipOrKey, userId) {
  const key = `totp:${ipOrKey}:${userId}`;
  if (isRateLimited(key)) {
    const err = new Error('Too many attempts');
    err.status = 429;
    throw err;
  }
}

module.exports = {
  CHALLENGE_TTL_SEC,
  encryptSecret,
  decryptSecret,
  issueChallengeToken,
  verifyChallengeToken,
  createTotpSecret,
  buildOtpauthUrl,
  buildQrDataUrl,
  verifyTotpCode,
  assertTotpRateLimit,
  isRateLimited,
};
