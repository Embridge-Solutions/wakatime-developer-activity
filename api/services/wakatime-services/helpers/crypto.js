// AES-256-GCM encryption for developers' WakaTime API keys stored in SQL Server.
// Same format as the first collector (src/crypto.js), so keys saved with the same
// secret still decrypt. Changing WAKA_TOKEN_SECRET makes every saved key unreadable.
const crypto = require('crypto');
const ENV = require('../../../config/env');

const isSecretConfigured = () => Boolean(ENV.WAKA_TOKEN_SECRET && ENV.WAKA_TOKEN_SECRET.length >= 16);

const key = () => {
  if (!isSecretConfigured()) {
    throw new Error('WAKA_TOKEN_SECRET is missing or shorter than 16 characters in .env');
  }
  return crypto.createHash('sha256').update(ENV.WAKA_TOKEN_SECRET).digest();
};

const encrypt = (plain) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, enc].map((b) => b.toString('base64')).join(':');
};

const decrypt = (payload) => {
  const [iv, tag, enc] = String(payload).split(':').map((s) => Buffer.from(s, 'base64'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
};

/** Last 4 characters, shown on screen as ••••abcd */
const keyHint = (apiKey) => String(apiKey).slice(-4);

module.exports = { isSecretConfigured, encrypt, decrypt, keyHint };
