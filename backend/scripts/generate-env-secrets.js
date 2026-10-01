/**
 * Erzeugt Zufallswerte für Strapi-Schlüssel, Salts und JWT-Secrets.
 * Aufruf: node scripts/generate-env-secrets.js
 * Die Ausgabe in die gewünschte .env-Datei übernehmen.
 */

const crypto = require('crypto');

function randomBase64(bytes = 16) {
  return crypto.randomBytes(bytes).toString('base64');
}

const appKeys = [
  randomBase64(),
  randomBase64(),
  randomBase64(),
  randomBase64(),
].join(',');

console.log('# Neue Secrets (in .env eintragen):\n');
console.log('APP_KEYS=' + appKeys);
console.log('API_TOKEN_SALT=' + randomBase64());
console.log('ADMIN_JWT_SECRET=' + randomBase64());
console.log('TRANSFER_TOKEN_SALT=' + randomBase64());
console.log('JWT_SECRET=' + randomBase64());
console.log('ENCRYPTION_KEY=' + randomBase64());
