// Weekly reports: every developer gets their own week; users who may see every developer
// (scope activity_viewall / Super Admin) get the whole team. Same procedures as the dashboards.
const ENV = require('../../../config/env');
const logger = require('../../../utils/logger');
const { sql, execProc } = require('../../../utils/procedure');
const { dayString, shiftDay } = require('../../wakatime-services/helpers/dates');
const { isSmtpConfigured, sendMail, parseEmails } = require('./mailer');
const templates = require('./templates');
const store = require('./store');

/** Previous Monday–Sunday (IST) for the given moment. */
const lastWeek = (now = new Date()) => {
  const today = dayString(now, ENV.MAIL_TIME_ZONE);
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay(); // 0 = Sunday
  const thisMonday = shiftDay(today, -((weekday + 6) % 7));
  return { fromDate: shiftDay(thisMonday, -7), toDate: shiftDay(thisMonday, -1) };
};

const range = ({ fromDate, toDate }, developerId = null) => ({
  pIN_fromDate: [sql.Date, fromDate],
  pIN_toDate: [sql.Date, toDate],
  pIN_developerId: [sql.Int, developerId],
});
const tz = { pIN_timeZone: [sql.VarChar(60), ENV.SQL_TIME_ZONE] };
const breakdown = (period, developerId, dimension, top) =>
  execProc('PRC_Get_Activity_Breakdown', { ...range(period, developerId), pIN_dimension: [sql.VarChar(30), dimension], pIN_top: [sql.Int, top] });

/** One developer's week. */
const buildDeveloperReport = async (developer, period) => {
  const id = developer.developerId;
  const [summary, daily, projects, languages, branches, agents] = await Promise.all([
    execProc('PRC_Get_Activity_Summary', range(period, id)).then((r) => r[0]),
    execProc('PRC_Get_Activity_Daily', { ...range(period, id), ...tz }),
    breakdown(period, id, 'project', 10),
    breakdown(period, id, 'language', 10),
    breakdown(period, id, 'branch', 10),
    execProc('PRC_Get_Activity_Agents', { ...range(period, id), ...tz }),
  ]);
  return { ...period, developer, summary, daily, projects, languages, branches, agents };
};

/** The whole team's week. */
const buildTeamReport = async (period) => {
  const [summary, developers, projects, aiModels] = await Promise.all([
    execProc('PRC_Get_Activity_Summary', range(period)).then((r) => r[0]),
    execProc('PRC_Get_Activity_Developers', { ...range(period), ...tz }),
    breakdown(period, null, 'project', 20),
    execProc('PRC_Get_Activity_AI_Models', range(period)),
  ]);
  return { ...period, summary, developers, projects, aiModels };
};

/** Claim → send → finish. The claim makes a second send of the same mail impossible. */
const sendOnce = async ({ mailType, periodKey, email, name, mail, triggeredBy }) => {
  const claim = await store.claimSend({ mailType, periodKey, email, name, subject: mail.subject, triggeredBy });
  if (claim?.resultCode !== 'OK') return 'alreadySent';
  try {
    await sendMail({ to: email, subject: mail.subject, html: mail.html, text: mail.text });
    await store.finishSend(claim.logId, 'SENT', { subject: mail.subject });
    return 'sent';
  } catch (err) {
    await store.finishSend(claim.logId, 'FAILED', { subject: mail.subject, error: err.message });
    logger.error(`[weeklyMail] ${mailType} to ${email} failed`, err);
    return 'failed';
  }
};

let running = false;

/**
 * Sends last week's reports.
 * @param {{ triggeredBy, force?: boolean, only?: 'developers' | 'team' }} options
 *   force = send again even to people who already got this week's mail
 */
const runWeeklyReports = async ({ triggeredBy = 'scheduler', force = false, only } = {}) => {
  if (running) return { status: 'ALREADY_RUNNING' };
  if (!isSmtpConfigured()) return { status: 'SMTP_NOT_CONFIGURED' };
  running = true;
  const period = lastWeek();
  const periodKey = `week:${period.fromDate}${force ? `:resend:${Date.now()}` : ''}`;
  const result = { status: 'DONE', ...period, sent: 0, failed: 0, alreadySent: 0, skippedIdle: 0 };
  const count = (r) => (result[r] += 1);
  try {
    const { settings } = await store.getSetting('weeklyReport');

    if (settings.sendToDevelopers && only !== 'team') {
      for (const developer of await store.getDeveloperRecipients()) {
        const data = await buildDeveloperReport(developer, period);
        if (!settings.includeIdleDevelopers && !(data.summary?.totalSeconds > 0)) {
          result.skippedIdle++;
          continue;
        }
        const mail = templates.weeklyDeveloper(data);
        count(await sendOnce({ mailType: 'weeklyDeveloper', periodKey, email: developer.email, name: developer.developerName, mail, triggeredBy }));
      }
    }

    if (only !== 'developers') {
      const viewers = settings.sendToTeamViewers ? await store.getTeamRecipients() : [];
      const extra = parseEmails(settings.extraTeamRecipients).map((email) => ({ email, name: '' }));
      const recipients = [...new Map([...viewers, ...extra].map((r) => [r.email, r])).values()];
      if (recipients.length) {
        const mail = templates.weeklyTeam(await buildTeamReport(period));
        for (const r of recipients) {
          count(await sendOnce({ mailType: 'weeklyTeam', periodKey, email: r.email, name: r.name, mail, triggeredBy }));
        }
      }
    }
    logger.info(`[weeklyMail] ${period.fromDate}…${period.toDate}: ${result.sent} sent, ${result.alreadySent} already sent, ${result.failed} failed`);
    return result;
  } finally {
    running = false;
  }
};

module.exports = { lastWeek, buildDeveloperReport, buildTeamReport, runWeeklyReports };
