const cron = require('node-cron');
const ENV = require('../../../config/env');
const logger = require('../../../utils/logger');
const store = require('./store');
const { runWeeklyReports } = require('./weekly');

let task = null;

/** Settings → cron: dayOfWeek 1 (Mon) … 7 (Sun), time "HH:mm" → "30 9 * * 1" */
const toCron = ({ dayOfWeek, time }) => {
  const [h, m] = String(time || '09:30').split(':').map(Number);
  return `${m || 0} ${h || 0} * * ${Number(dayOfWeek) % 7}`;
};

/** (Re)schedules the weekly report from its settings. Called at start and after every save. */
const scheduleWeeklyReport = async () => {
  if (task) {
    task.stop();
    task = null;
  }
  if (!ENV.MAIL_SCHEDULER_ENABLED) return logger.info('[mailScheduler] disabled (MAIL_SCHEDULER_ENABLED=false)');
  const setting = await store.getSetting('weeklyReport');
  if (!setting.isEnabled) return logger.info('[mailScheduler] weekly report is switched off');
  const expression = toCron(setting.settings);
  if (!cron.validate(expression)) return logger.error(`[mailScheduler] invalid schedule "${expression}"`);

  task = cron.schedule(
    expression,
    () =>
      runWeeklyReports({ triggeredBy: 'scheduler' }).catch((err) => logger.error('[mailScheduler] weekly report failed', err)),
    { timezone: ENV.MAIL_TIME_ZONE },
  );
  logger.info(`[mailScheduler] weekly report "${expression}" (${ENV.MAIL_TIME_ZONE})`);
};

const startMailScheduler = () =>
  scheduleWeeklyReport().catch((err) => logger.error('[mailScheduler] could not start', err));

module.exports = { startMailScheduler, scheduleWeeklyReport, toCron };
