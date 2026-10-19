// Token protection: every admin change of a WakaTime token (set / replace / remove) must be
// confirmed with the token protection password (Settings › Security). Developers changing their
// own token confirm with their own login password. Passwords are compared with bcrypt hashes only.
const bcrypt = require('bcrypt');
const { db } = require('../../../communications/models');
const { sql, execProc } = require('../../../utils/procedure');
const { SECURITY } = require('../../../data/statusMessage');

const KEY_PASSWORD = 'tokenProtection';
const KEY_SELF = 'developerSelfToken';

/* Wrong passwords: 5 tries, then locked for 15 minutes (per user, per kind). */
const MAX_TRIES = 5;
const LOCK_MS = 15 * 60 * 1000;
const attempts = new Map();

const isLocked = (key) => {
  const a = attempts.get(key);
  if (!a?.lockedUntil) return false;
  if (a.lockedUntil > Date.now()) return true;
  attempts.delete(key);
  return false;
};
const recordFailure = (key) => {
  const a = attempts.get(key) || { fails: 0 };
  a.fails += 1;
  if (a.fails >= MAX_TRIES) a.lockedUntil = Date.now() + LOCK_MS;
  attempts.set(key, a);
};

const readSetting = async (key) => (await execProc('PRC_Get_Security_Setting', { pIN_settingKey: [sql.VarChar(50), key] }))[0];
const saveSetting = (key, value, by) =>
  execProc('PRC_Save_Security_Setting', {
    pIN_settingKey: [sql.VarChar(50), key],
    pIN_settingValue: [sql.NVarChar(500), value],
    pIN_updatedBy: [sql.NVarChar(100), by],
  });

/** Status for the settings screen — never the hash. */
const getStatus = async () => {
  const [pw, self] = await Promise.all([readSetting(KEY_PASSWORD), readSetting(KEY_SELF)]);
  return {
    tokenPassword: { isSet: Boolean(pw?.settingValue), updatedBy: pw?.updatedBy || '', updatedDate: pw?.updatedDate || null },
    developerSelfToken: self ? self.settingValue === '1' : true,
  };
};

/**
 * Checks the token protection password.
 * @returns null when OK, otherwise the status message to answer with
 */
const checkTokenPassword = async (req, password) => {
  const key = `token:${req.user?.id}`;
  if (isLocked(key)) return SECURITY.LOCKED;
  const pw = await readSetting(KEY_PASSWORD);
  if (!pw?.settingValue) return SECURITY.TOKEN_PASSWORD_NOT_SET;
  if (!password) return SECURITY.TOKEN_PASSWORD_REQUIRED;
  if (!(await bcrypt.compare(String(password), pw.settingValue))) {
    recordFailure(key);
    return SECURITY.TOKEN_PASSWORD_WRONG;
  }
  attempts.delete(key);
  return null;
};

/** Checks the logged-in user's own login password. @returns null when OK, otherwise the status */
const checkLoginPassword = async (req, password) => {
  const key = `login:${req.user?.id}`;
  if (isLocked(key)) return SECURITY.LOCKED;
  if (!password) return SECURITY.LOGIN_PASSWORD_REQUIRED;
  const user = await db.E2M_User.findOne({ where: { id: req.user?.id, isActive: false }, attributes: ['password'], raw: true });
  if (!user || !(await bcrypt.compare(String(password), user.password))) {
    recordFailure(key);
    return SECURITY.LOGIN_PASSWORD_WRONG;
  }
  attempts.delete(key);
  return null;
};

const isSelfTokenAllowed = async () => {
  const self = await readSetting(KEY_SELF);
  return self ? self.settingValue === '1' : true;
};

/** 8+ characters with a letter and a number. @returns status message or null */
const weakPassword = (pw) =>
  String(pw ?? '').length < 8 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw) ? SECURITY.WEAK_PASSWORD : null;

const setTokenPassword = async (newPassword, by) => saveSetting(KEY_PASSWORD, await bcrypt.hash(String(newPassword), 12), by);
const setSelfToken = (enabled, by) => saveSetting(KEY_SELF, enabled ? '1' : '0', by);

module.exports = {
  getStatus,
  checkTokenPassword,
  checkLoginPassword,
  isSelfTokenAllowed,
  weakPassword,
  setTokenPassword,
  setSelfToken,
};
