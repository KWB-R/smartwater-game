'use strict';

const path = require('path');

const totp = require(path.join(__dirname, '../../../../../utils/totp.js'));

const UID = 'plugin::admin-totp.admin-totp-credential';

function isTotpRequired() {
  const raw = process.env.ADMIN_TOTP_REQUIRED;
  if (raw == null || raw === '') {
    return true;
  }
  return String(raw).toLowerCase() !== 'false' && raw !== '0';
}

module.exports = ({ strapi }) => ({
  isTotpRequired,

  async findByAdminUserId(adminUserId) {
    return strapi.db.query(UID).findOne({
      where: { adminUserId: String(adminUserId) },
    });
  },

  async upsertPending(adminUserId, secretPlain) {
    const existing = await this.findByAdminUserId(adminUserId);
    const data = {
      adminUserId: String(adminUserId),
      pendingSecretEncrypted: totp.encryptSecret(secretPlain),
      secretEncrypted:
        existing?.secretEncrypted || totp.encryptSecret(secretPlain),
      enabled: existing?.enabled === true,
    };
    if (existing) {
      return strapi.db.query(UID).update({
        where: { id: existing.id },
        data,
      });
    }
    return strapi.db.query(UID).create({ data });
  },

  async confirmEnable(adminUserId, secretPlain) {
    const existing = await this.findByAdminUserId(adminUserId);
    const data = {
      adminUserId: String(adminUserId),
      secretEncrypted: totp.encryptSecret(secretPlain),
      pendingSecretEncrypted: null,
      enabled: true,
    };
    if (existing) {
      return strapi.db.query(UID).update({
        where: { id: existing.id },
        data,
      });
    }
    return strapi.db.query(UID).create({ data });
  },

  async disable(adminUserId) {
    const existing = await this.findByAdminUserId(adminUserId);
    if (!existing) return null;
    return strapi.db.query(UID).update({
      where: { id: existing.id },
      data: {
        enabled: false,
        secretEncrypted: totp.encryptSecret(totp.createTotpSecret()),
        pendingSecretEncrypted: null,
      },
    });
  },

  totp,
});
