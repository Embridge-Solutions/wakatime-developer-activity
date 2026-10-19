const { DEVELOPER } = require('../../../data/statusMessage');
const { fail } = require('../../../utils');
const { safeNum } = require('../../../utils/safeParam');
const { sql, execProc } = require('../../../utils/procedure');
const { isSecretConfigured, encrypt, keyHint } = require('../../wakatime-services/helpers/crypto');
const { verifyApiKey: checkWithWakaTime, isOAuthToken } = require('../../wakatime-services/helpers/wakaClient');
const guard = require('../../security-services/helpers/tokenGuard');
const { sendTokenChangedMail } = require('../../mail-services/helpers/events');

/** Admin token change: the token protection password (Settings › Security). @returns true when an error was sent */
const deniedTokenPassword = async (req, res) => {
  const problem = await guard.checkTokenPassword(req, req.body?.confirmPassword);
  if (problem) send(res, problem);
  return Boolean(problem);
};

// ── Developer master ───────────────────────────────────────────────────────
// Procedures in sql/02_E2M_Developer_Procedures.sql. Insert / update answer a
// resultCode; anything other than OK maps to a message below.
// The encrypted API key never leaves the database; the screen gets hasApiKey + apiKeyHint.

const RESULT = {
  NOT_FOUND: DEVELOPER.NOT_FOUND,
  EMAIL_EXISTS: DEVELOPER.EMAIL_EXISTS,
  CODE_EXISTS: DEVELOPER.CODE_EXISTS,
  WAKA_ACCOUNT_EXISTS: DEVELOPER.WAKA_ACCOUNT_EXISTS,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const send = (res, status, body) => res.status(status.CODE).json({ success: status.CODE < 400, msg: status.MESSAGE, ...body });

/** Sends the error for a non-OK resultCode. @returns true when a response was sent */
const sentResultError = (res, resultCode) => {
  if (resultCode === 'OK') return false;
  send(res, RESULT[resultCode] || DEVELOPER.NOT_FOUND);
  return true;
};

const username = (req) => req.user?.username || null;

const getById = async (developerId) =>
  (await execProc('PRC_Get_Developer_List', { pIN_developerId: [sql.Int, developerId] }))[0];

/** Body → procedure parameters shared by add / update. @returns { error } or { params } */
const developerParams = (body = {}) => {
  const developerName = String(body.developerName ?? '').trim();
  const email = String(body.email ?? '').trim().toLowerCase();
  if (!developerName || !email) return { error: DEVELOPER.REQUIRED };
  if (!EMAIL_RE.test(email)) return { error: DEVELOPER.INVALID_EMAIL };
  return {
    params: {
      pIN_developerCode: [sql.VarChar(30), body.developerCode],
      pIN_developerName: [sql.NVarChar(150), developerName],
      pIN_email: [sql.NVarChar(200), email],
      pIN_phone: [sql.VarChar(20), body.phone],
      pIN_designation: [sql.NVarChar(100), body.designation],
      pIN_team: [sql.NVarChar(100), body.team],
      pIN_userId: [sql.Int, safeNum(body.userId)],
    },
  };
};

/**
 * Verifies a token with WakaTime and encrypts it — no response is sent, so the
 * user form (user-services) can use it too.
 * @returns {{ account, params }} or {{ error: <status message>, detail? }}
 */
const verifyAndEncrypt = async (rawKey) => {
  const apiKey = String(rawKey ?? '').trim();
  if (!apiKey) return { error: DEVELOPER.API_KEY_REQUIRED };
  if (!isSecretConfigured()) return { error: DEVELOPER.SECRET_MISSING };

  let account;
  try {
    account = await checkWithWakaTime(apiKey);
  } catch (err) {
    // A secret API key (waka_…) is write-only for WakaTime — say so instead of just "rejected"
    if (err.isAuthError) return { error: isOAuthToken(apiKey) ? DEVELOPER.API_KEY_INVALID : DEVELOPER.API_KEY_WRITE_ONLY };
    return { error: DEVELOPER.API_KEY_CHECK_FAILED, detail: err.message };
  }

  return {
    account,
    params: {
      pIN_apiKeyEnc: [sql.NVarChar(1000), encrypt(apiKey)],
      pIN_apiKeyHint: [sql.VarChar(10), keyHint(apiKey)],
      pIN_wakaUserId: [sql.NVarChar(64), account.wakaUserId],
      pIN_wakaUsername: [sql.NVarChar(100), account.wakaUsername],
      pIN_wakaTimezone: [sql.VarChar(64), account.timezone],
    },
  };
};

/** verifyAndEncrypt + error response. @returns {{ account, params }} or null when a response was sent */
const prepareApiKey = async (res, rawKey) => {
  const key = await verifyAndEncrypt(rawKey);
  if (key.error) {
    send(res, key.error, key.detail ? { detail: key.detail } : {});
    return null;
  }
  return key;
};

// GET /getDevelopers?status=ALL|ACTIVE|INACTIVE&search=ravi
const getDevelopers = async (req, res) => {
  const { status, search } = req.query;
  try {
    const data = await execProc('PRC_Get_Developer_List', {
      pIN_status: [sql.VarChar(10), status],
      pIN_search: [sql.NVarChar(150), search],
    });
    return res.json({ success: true, msg: DEVELOPER.SUCCESS.MESSAGE, data });
  } catch (err) {
    return fail(res, 'getDevelopers', err);
  }
};

// GET /getDeveloper/:id
const getDeveloper = async (req, res) => {
  const developerId = safeNum(req.params.id);
  try {
    const developer = developerId && (await getById(developerId));
    if (!developer) return send(res, DEVELOPER.NOT_FOUND);
    return res.json({ success: true, msg: DEVELOPER.SUCCESS.MESSAGE, data: developer });
  } catch (err) {
    return fail(res, 'getDeveloper', err);
  }
};

// POST /addDeveloper { developerName, email, developerCode?, phone?, designation?, team?, userId?, isActive?, apiKey? }
// apiKey is optional — it can be added later with PUT /updateApiKey/:id
const addDeveloper = async (req, res) => {
  const body = req.body || {};
  const { error, params } = developerParams(body);
  if (error) return send(res, error);

  try {
    let keyParams = {};
    let account = null;
    if (body.apiKey) {
      if (await deniedTokenPassword(req, res)) return undefined;
      const key = await prepareApiKey(res, body.apiKey);
      if (!key) return undefined;
      keyParams = key.params;
      account = key.account;
    }

    const [row] = await execProc('PRC_Insert_Developer', {
      ...params,
      ...keyParams,
      pIN_isActive: [sql.Bit, body.isActive === undefined ? true : Boolean(body.isActive)],
      pIN_createdBy: [sql.NVarChar(100), username(req)],
    });
    if (sentResultError(res, row?.resultCode)) return undefined;

    const created = await getById(row.developerId);
    if (account) sendTokenChangedMail({ developer: created, action: 'SET', changedBy: username(req), via: 'New developer' });
    return send(res, DEVELOPER.CREATED, {
      data: created,
      warning: account?.timezoneWarning || null,
    });
  } catch (err) {
    return fail(res, 'addDeveloper', err);
  }
};

// PUT /updateDeveloper/:id { developerName, email, developerCode?, phone?, designation?, team?, userId? }
const updateDeveloper = async (req, res) => {
  const developerId = safeNum(req.params.id);
  if (!developerId) return send(res, DEVELOPER.NOT_FOUND);
  const { error, params } = developerParams(req.body);
  if (error) return send(res, error);

  try {
    const [row] = await execProc('PRC_Update_Developer', {
      pIN_developerId: [sql.Int, developerId],
      ...params,
      pIN_updatedBy: [sql.NVarChar(100), username(req)],
    });
    if (sentResultError(res, row?.resultCode)) return undefined;
    return send(res, DEVELOPER.UPDATE, { data: await getById(developerId) });
  } catch (err) {
    return fail(res, 'updateDeveloper', err);
  }
};

// PUT /updateStatus/:id { isActive: true | false }
const updateStatus = async (req, res) => {
  const developerId = safeNum(req.params.id);
  const { isActive } = req.body || {};
  if (!developerId) return send(res, DEVELOPER.NOT_FOUND);
  if (typeof isActive !== 'boolean') return send(res, DEVELOPER.STATUS_REQUIRED);

  try {
    const [row] = await execProc('PRC_Update_Developer_Status', {
      pIN_developerId: [sql.Int, developerId],
      pIN_isActive: [sql.Bit, isActive],
      pIN_updatedBy: [sql.NVarChar(100), username(req)],
    });
    if (sentResultError(res, row?.resultCode)) return undefined;
    return send(res, isActive ? DEVELOPER.ACTIVATED : DEVELOPER.DEACTIVATED, { data: await getById(developerId) });
  } catch (err) {
    return fail(res, 'updateStatus', err);
  }
};

// DELETE /deleteDeveloper/:id — soft delete, collected activity is kept
const deleteDeveloper = async (req, res) => {
  const developerId = safeNum(req.params.id);
  if (!developerId) return send(res, DEVELOPER.NOT_FOUND);

  try {
    const [row] = await execProc('PRC_Delete_Developer', {
      pIN_developerId: [sql.Int, developerId],
      pIN_deletedBy: [sql.NVarChar(100), username(req)],
    });
    if (sentResultError(res, row?.resultCode)) return undefined;
    return send(res, DEVELOPER.DELETE);
  } catch (err) {
    return fail(res, 'deleteDeveloper', err);
  }
};

// ── WakaTime API key ───────────────────────────────────────────────────────

// POST /verifyApiKey { apiKey } — "Test key" button; checks with WakaTime, saves nothing
const verifyApiKey = async (req, res) => {
  try {
    const key = await prepareApiKey(res, req.body?.apiKey);
    if (!key) return undefined;
    return send(res, DEVELOPER.API_KEY_VALID, { data: key.account, warning: key.account.timezoneWarning });
  } catch (err) {
    return fail(res, 'verifyApiKey', err);
  }
};

// PUT /updateApiKey/:id { apiKey, confirmPassword } — token protection password, verify, encrypt, save
const updateApiKey = async (req, res) => {
  const developerId = safeNum(req.params.id);
  if (!developerId) return send(res, DEVELOPER.NOT_FOUND);

  try {
    if (await deniedTokenPassword(req, res)) return undefined;
    const before = await getById(developerId);
    const key = await prepareApiKey(res, req.body?.apiKey);
    if (!key) return undefined;

    const [row] = await execProc('PRC_Update_Developer_Api_Key', {
      pIN_developerId: [sql.Int, developerId],
      ...key.params,
      pIN_updatedBy: [sql.NVarChar(100), username(req)],
    });
    if (sentResultError(res, row?.resultCode)) return undefined;
    const after = await getById(developerId);
    sendTokenChangedMail({ developer: after, action: before?.hasApiKey ? 'REPLACED' : 'SET', changedBy: username(req), via: 'WakaTime Tokens screen' });
    return send(res, DEVELOPER.API_KEY_UPDATE, {
      data: after,
      warning: key.account.timezoneWarning,
    });
  } catch (err) {
    return fail(res, 'updateApiKey', err);
  }
};

// DELETE /removeApiKey/:id { confirmPassword } — the developer is no longer collected until a new key is saved
const removeApiKey = async (req, res) => {
  const developerId = safeNum(req.params.id);
  if (!developerId) return send(res, DEVELOPER.NOT_FOUND);

  try {
    if (await deniedTokenPassword(req, res)) return undefined;
    const before = await getById(developerId);
    const [row] = await execProc('PRC_Update_Developer_Api_Key', {
      pIN_developerId: [sql.Int, developerId],
      pIN_apiKeyEnc: [sql.NVarChar(1000), null],
      pIN_updatedBy: [sql.NVarChar(100), username(req)],
    });
    if (sentResultError(res, row?.resultCode)) return undefined;
    if (before) sendTokenChangedMail({ developer: before, action: 'REMOVED', changedBy: username(req), via: 'WakaTime Tokens screen' });
    return send(res, DEVELOPER.API_KEY_REMOVED, { data: await getById(developerId) });
  } catch (err) {
    return fail(res, 'removeApiKey', err);
  }
};

// ── My WakaTime (any logged-in user, only their own developer) ─────────────

const myDeveloper = async (req) => {
  const [own] = await execProc('PRC_Get_Developer_By_User', { pIN_userId: [sql.Int, req.user?.id] });
  return own ? getById(own.developerId) : null;
};

// GET /getMyDeveloper — tracked? token status (never the token)
const getMyDeveloper = async (req, res) => {
  try {
    const me = await myDeveloper(req);
    return res.json({ success: true, msg: DEVELOPER.SUCCESS.MESSAGE, data: me || null });
  } catch (err) {
    return fail(res, 'getMyDeveloper', err);
  }
};

// POST /verifyMyApiKey { apiKey } — Test button on My WakaTime
const verifyMyApiKey = async (req, res) => {
  try {
    if (!(await myDeveloper(req))) return send(res, DEVELOPER.NOT_TRACKED);
    const key = await prepareApiKey(res, req.body?.apiKey);
    if (!key) return undefined;
    return send(res, DEVELOPER.API_KEY_VALID, { data: key.account, warning: key.account.timezoneWarning });
  } catch (err) {
    return fail(res, 'verifyMyApiKey', err);
  }
};

// PUT /updateMyApiKey { apiKey, loginPassword } — the developer saves their own token,
// confirmed with their own login password (when Settings › Security allows self-service)
const updateMyApiKey = async (req, res) => {
  try {
    const me = await myDeveloper(req);
    if (!me) return send(res, DEVELOPER.NOT_TRACKED);
    if (!(await guard.isSelfTokenAllowed())) return send(res, DEVELOPER.SELF_TOKEN_OFF);
    const problem = await guard.checkLoginPassword(req, req.body?.loginPassword);
    if (problem) return send(res, problem);
    const key = await prepareApiKey(res, req.body?.apiKey);
    if (!key) return undefined;
    const [row] = await execProc('PRC_Update_Developer_Api_Key', {
      pIN_developerId: [sql.Int, me.developerId],
      ...key.params,
      pIN_updatedBy: [sql.NVarChar(100), username(req)],
    });
    if (sentResultError(res, row?.resultCode)) return undefined;
    const after = await getById(me.developerId);
    sendTokenChangedMail({ developer: after, action: me.hasApiKey ? 'REPLACED' : 'SET', changedBy: username(req), via: 'My WakaTime (by the developer)' });
    return send(res, DEVELOPER.API_KEY_UPDATE, { data: after, warning: key.account.timezoneWarning });
  } catch (err) {
    return fail(res, 'updateMyApiKey', err);
  }
};

module.exports = {
  getMyDeveloper,
  verifyMyApiKey,
  updateMyApiKey,
  getDevelopers,
  getDeveloper,
  addDeveloper,
  updateDeveloper,
  updateStatus,
  deleteDeveloper,
  verifyApiKey,
  updateApiKey,
  removeApiKey,
  verifyAndEncrypt,
  RESULT,
};
