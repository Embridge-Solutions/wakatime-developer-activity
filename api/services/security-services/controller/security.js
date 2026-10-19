const { SECURITY } = require('../../../data/statusMessage');
const { fail } = require('../../../utils');
const { isSuperAdmin } = require('../../../communications/middleware/access');
const guard = require('../helpers/tokenGuard');
const { sendSecurityChangedMail } = require('../../mail-services/helpers/events');

const send = (res, status, body) => res.status(status.CODE).json({ success: status.CODE < 400, msg: status.MESSAGE, ...body });

// GET /getSecurity — is the token password set (never the password / hash), may developers update their own token
const getSecurity = async (req, res) => {
  try {
    return res.json({ success: true, msg: SECURITY.SUCCESS.MESSAGE, data: await guard.getStatus() });
  } catch (err) {
    return fail(res, 'getSecurity', err);
  }
};

// PUT /setTokenPassword { currentPassword?, loginPassword?, newPassword, confirmPassword }
//   first time: no current password needed
//   change: the current token password — or, for a Super Admin who lost it, their own login password
const setTokenPassword = async (req, res) => {
  const { currentPassword, loginPassword, newPassword, confirmPassword } = req.body || {};
  try {
    const weak = guard.weakPassword(newPassword);
    if (weak) return send(res, weak);
    if (newPassword !== confirmPassword) return send(res, SECURITY.MISMATCH);

    const { tokenPassword } = await guard.getStatus();
    if (tokenPassword.isSet) {
      let problem;
      if (currentPassword) problem = await guard.checkTokenPassword(req, currentPassword);
      else if (loginPassword && isSuperAdmin(req)) problem = await guard.checkLoginPassword(req, loginPassword);
      else problem = SECURITY.CURRENT_REQUIRED;
      if (problem) return send(res, problem);
    }

    await guard.setTokenPassword(newPassword, req.user?.username);
    sendSecurityChangedMail({ changedBy: req.user?.username, what: tokenPassword.isSet ? 'changed' : 'set' });
    return send(res, tokenPassword.isSet ? SECURITY.PASSWORD_CHANGED : SECURITY.PASSWORD_SET);
  } catch (err) {
    return fail(res, 'setTokenPassword', err);
  }
};

// PUT /setDeveloperSelfToken { enabled }
const setDeveloperSelfToken = async (req, res) => {
  try {
    await guard.setSelfToken(Boolean(req.body?.enabled), req.user?.username);
    return send(res, SECURITY.UPDATE, { data: await guard.getStatus() });
  } catch (err) {
    return fail(res, 'setDeveloperSelfToken', err);
  }
};

module.exports = { getSecurity, setTokenPassword, setDeveloperSelfToken };
