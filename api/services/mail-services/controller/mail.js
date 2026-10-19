const { MAIL } = require('../../../data/statusMessage');
const { fail } = require('../../../utils');
const { safeNum } = require('../../../utils/safeParam');
const { smtpStatus, verifySmtp, sendMail, parseEmails, isSmtpConfigured } = require('../helpers/mailer');
const store = require('../helpers/store');
const templates = require('../helpers/templates');
const { lastWeek, buildDeveloperReport, buildTeamReport, runWeeklyReports } = require('../helpers/weekly');
const { sendWelcomeMail } = require('../helpers/welcome');
const { scheduleWeeklyReport, toCron } = require('../helpers/scheduler');

const send = (res, status, body) => res.status(status.CODE).json({ success: status.CODE < 400, msg: status.MESSAGE, ...body });
const WEEKDAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Cleans the settings sent by the screen. @returns { settings } or { error } */
const validate = (mailType, input = {}) => {
  if (mailType === 'weeklyReport') {
    const dayOfWeek = Number(input.dayOfWeek);
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 7) return { error: MAIL.INVALID_DAY };
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(input.time))) return { error: MAIL.INVALID_TIME };
    const extra = String(input.extraTeamRecipients ?? '').slice(0, 2000);
    const bad = extra.split(/[;,\s]+/).filter((e) => e && !parseEmails(e).length);
    if (bad.length) return { error: MAIL.INVALID_EMAIL, detail: bad.join(', ') };
    return {
      settings: {
        dayOfWeek,
        time: input.time,
        sendToDevelopers: Boolean(input.sendToDevelopers),
        sendToTeamViewers: Boolean(input.sendToTeamViewers),
        includeIdleDevelopers: Boolean(input.includeIdleDevelopers),
        extraTeamRecipients: parseEmails(extra).join(', '),
      },
    };
  }
  if (mailType === 'welcome') return { settings: { extraNote: String(input.extraNote ?? '').slice(0, 2000) } };
  return { error: MAIL.INVALID_TYPE };
};

// GET /getSettings — every mail type + when the weekly report runs next
const getSettings = async (req, res) => {
  try {
    const settings = await store.getSettings();
    const w = settings.weeklyReport.settings;
    return res.json({
      success: true,
      msg: MAIL.SUCCESS.MESSAGE,
      data: settings,
      schedule: { cron: toCron(w), text: `Every ${WEEKDAYS[w.dayOfWeek]} at ${w.time}`, lastWeek: lastWeek() },
    });
  } catch (err) {
    return fail(res, 'getSettings', err);
  }
};

// PUT /updateSetting/:mailType { isEnabled, settings }
const updateSetting = async (req, res) => {
  const { mailType } = req.params;
  const { error, detail, settings } = validate(mailType, req.body?.settings);
  if (error) return send(res, error, detail ? { detail } : {});
  try {
    await store.saveSetting(mailType, req.body?.isEnabled, settings, req.user?.username);
    if (mailType === 'weeklyReport') await scheduleWeeklyReport();
    return send(res, MAIL.UPDATE, { data: (await store.getSettings())[mailType] });
  } catch (err) {
    return fail(res, 'updateSetting', err);
  }
};

// GET /getSmtpStatus — host, port, masked user, password set yes/no (never the password)
const getSmtpStatus = (req, res) => res.json({ success: true, msg: MAIL.SUCCESS.MESSAGE, data: smtpStatus() });

// POST /testSmtp — connect + log in, nothing sent
const testSmtp = async (req, res) => {
  if (!isSmtpConfigured()) return send(res, MAIL.NOT_CONFIGURED);
  const result = await verifySmtp();
  return result.ok ? send(res, MAIL.SMTP_OK) : send(res, MAIL.SMTP_FAILED, { detail: result.error });
};

/** Builds a mail of the given kind with real data (last week / the current user). */
const buildMail = async (kind, req) => {
  const period = lastWeek();
  if (kind === 'weeklyDeveloper') {
    const recipients = await store.getDeveloperRecipients();
    const wanted = safeNum(req.body?.developerId);
    const developer = recipients.find((d) => d.developerId === wanted) || recipients[0];
    if (!developer) return { error: MAIL.NO_DEVELOPER };
    return { mail: templates.weeklyDeveloper(await buildDeveloperReport(developer, period)) };
  }
  if (kind === 'weeklyTeam') return { mail: templates.weeklyTeam(await buildTeamReport(period)) };
  if (kind === 'welcome') {
    const info = (await store.getWelcomeInfo(safeNum(req.body?.userId) || req.user?.id)) || {
      username: req.user?.username, name: '', roles: '', teams: '', isTracked: true, keyStatus: 'NOT_SET',
    };
    return { mail: templates.welcome(info, (await store.getSetting('welcome')).settings) };
  }
  return { error: MAIL.INVALID_TYPE };
};

// POST /preview { kind: weeklyDeveloper | weeklyTeam | welcome, developerId?, userId? } → { subject, html }
const preview = async (req, res) => {
  try {
    const { mail, error } = await buildMail(req.body?.kind, req);
    if (error) return send(res, error);
    return res.json({ success: true, msg: MAIL.SUCCESS.MESSAGE, data: { subject: mail.subject, html: mail.html } });
  } catch (err) {
    return fail(res, 'preview', err);
  }
};

// POST /sendTest { to, kind } — the chosen mail, with real data, to one address
const sendTest = async (req, res) => {
  const [to] = parseEmails(req.body?.to);
  if (!to) return send(res, MAIL.TEST_ADDRESS_REQUIRED);
  if (!isSmtpConfigured()) return send(res, MAIL.NOT_CONFIGURED);
  try {
    const { mail, error } = await buildMail(req.body?.kind || 'welcome', req);
    if (error) return send(res, error);
    const subject = `[Test] ${mail.subject}`;
    const claim = await store.claimSend({ mailType: 'test', email: to, subject, triggeredBy: `test · ${req.user?.username}` });
    try {
      await sendMail({ to, subject, html: mail.html, text: mail.text });
      await store.finishSend(claim.logId, 'SENT', { subject });
      return send(res, MAIL.TEST_SENT, { data: { to } });
    } catch (err) {
      await store.finishSend(claim.logId, 'FAILED', { subject, error: err.message });
      return send(res, MAIL.SEND_FAILED, { detail: err.message });
    }
  } catch (err) {
    return fail(res, 'sendTest', err);
  }
};

// POST /sendWeeklyNow { force?, only?: 'developers' | 'team' } — last week's reports now
const sendWeeklyNow = async (req, res) => {
  try {
    const result = await runWeeklyReports({
      triggeredBy: `manual · ${req.user?.username}`,
      force: Boolean(req.body?.force),
      only: ['developers', 'team'].includes(req.body?.only) ? req.body.only : undefined,
    });
    if (result.status === 'SMTP_NOT_CONFIGURED') return send(res, MAIL.NOT_CONFIGURED);
    if (result.status === 'ALREADY_RUNNING') return send(res, MAIL.ALREADY_RUNNING);
    return send(res, MAIL.WEEKLY_SENT, { data: result });
  } catch (err) {
    return fail(res, 'sendWeeklyNow', err);
  }
};

// GET /getMailLogs?top=200&mailType=
const getMailLogs = async (req, res) => {
  try {
    const top = Math.min(Math.max(Math.trunc(safeNum(req.query.top, 200)), 1), 1000);
    const data = await store.getLogs({ top, mailType: req.query.mailType });
    return res.json({ success: true, msg: MAIL.SUCCESS.MESSAGE, data });
  } catch (err) {
    return fail(res, 'getMailLogs', err);
  }
};

// POST /sendWelcome/:userId — the welcome mail again (Users list)
const sendWelcome = async (req, res) => {
  const userId = safeNum(req.params.userId);
  if (!userId) return send(res, MAIL.NO_USER);
  const result = await sendWelcomeMail(userId, { triggeredBy: `manual · ${req.user?.username}`, force: true });
  const status = result.status === 'SENT' ? MAIL.WELCOME_SENT : MAIL.WELCOME_NOT_SENT;
  return res.status(status.CODE).json({ success: result.status === 'SENT', msg: result.message });
};

module.exports = { getSettings, updateSetting, getSmtpStatus, testSmtp, preview, sendTest, sendWeeklyNow, getMailLogs, sendWelcome };
