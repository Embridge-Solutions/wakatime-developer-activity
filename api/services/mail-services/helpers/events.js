// Event mails — sent right after something security-relevant happens. Fire-and-forget:
// the change itself never fails because of a mail; every attempt is in Mail History.
const ENV = require('../../../config/env');
const logger = require('../../../utils/logger');
const { isSmtpConfigured, sendMail } = require('./mailer');
const templates = require('./templates');
const store = require('./store');

const nowIst = () =>
  new Date().toLocaleString('en-GB', { timeZone: ENV.MAIL_TIME_ZONE, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const sendToAll = async (mailType, recipients, mail, triggeredBy) => {
  const unique = [...new Map(recipients.filter((r) => r?.email).map((r) => [r.email.toLowerCase(), r])).values()];
  for (const r of unique) {
    const claim = await store.claimSend({ mailType, email: r.email, name: r.name, subject: mail.subject, triggeredBy });
    try {
      await sendMail({ to: r.email, subject: mail.subject, html: mail.html, text: mail.text });
      await store.finishSend(claim.logId, 'SENT', { subject: mail.subject });
    } catch (err) {
      await store.finishSend(claim.logId, 'FAILED', { subject: mail.subject, error: err.message });
    }
  }
};

/**
 * WakaTime token set / replaced / removed → every Super Admin + the developer.
 * @param {{ developer, action: 'SET'|'REPLACED'|'REMOVED', changedBy, via }} e
 */
const sendTokenChangedMail = (e) => {
  if (!isSmtpConfigured()) return;
  (async () => {
    const mail = templates.tokenChanged({
      developerName: e.developer.developerName,
      action: e.action,
      hint: e.developer.apiKeyHint,
      wakaUsername: e.developer.wakaUsername,
      changedBy: e.changedBy,
      via: e.via,
      when: nowIst(),
    });
    const admins = await store.getSuperAdminRecipients();
    const self = e.developer.email ? [{ email: e.developer.email, name: e.developer.developerName }] : [];
    if (e.developer.userId) {
      const info = await store.getWelcomeInfo(e.developer.userId);
      if (info?.email) self.push({ email: info.email, name: info.name });
    }
    await sendToAll('tokenChanged', [...admins, ...self], mail, e.changedBy);
  })().catch((err) => logger.error('[tokenChangedMail] failed', err));
};

/** Token protection password set / changed → every Super Admin. */
const sendSecurityChangedMail = ({ changedBy, what }) => {
  if (!isSmtpConfigured()) return;
  (async () => {
    const mail = templates.securityChanged({ changedBy, what, when: nowIst() });
    await sendToAll('securityChanged', await store.getSuperAdminRecipients(), mail, changedBy);
  })().catch((err) => logger.error('[securityChangedMail] failed', err));
};

module.exports = { sendTokenChangedMail, sendSecurityChangedMail };
