// Welcome mail with the next steps — sent when a user is created (or again from the Users list).
const logger = require('../../../utils/logger');
const { isSmtpConfigured, sendMail } = require('./mailer');
const templates = require('./templates');
const store = require('./store');

/**
 * Never throws — user creation must not fail because of a mail.
 * @returns {{ status: 'SENT' | 'FAILED' | 'SKIPPED', message }}
 */
const sendWelcomeMail = async (userId, { triggeredBy = 'system', force = false } = {}) => {
  try {
    const setting = await store.getSetting('welcome');
    if (!setting.isEnabled && !force) return { status: 'SKIPPED', message: 'Welcome mail is switched off in Settings' };
    if (!isSmtpConfigured()) return { status: 'SKIPPED', message: 'Mail server is not configured' };

    const info = await store.getWelcomeInfo(userId);
    if (!info) return { status: 'SKIPPED', message: 'User not found' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(info.email || '')) return { status: 'SKIPPED', message: 'User has no valid e-mail' };

    const mail = templates.welcome(info, setting.settings);
    const claim = await store.claimSend({ mailType: 'welcome', periodKey: null, email: info.email, name: info.name, subject: mail.subject, triggeredBy });
    try {
      await sendMail({ to: info.email, subject: mail.subject, html: mail.html, text: mail.text });
      await store.finishSend(claim.logId, 'SENT', { subject: mail.subject });
      return { status: 'SENT', message: `Welcome mail sent to ${info.email}` };
    } catch (err) {
      await store.finishSend(claim.logId, 'FAILED', { subject: mail.subject, error: err.message });
      return { status: 'FAILED', message: `Welcome mail failed: ${err.message}` };
    }
  } catch (err) {
    logger.error('[welcomeMail] error', err);
    return { status: 'FAILED', message: 'Welcome mail failed' };
  }
};

module.exports = { sendWelcomeMail };
