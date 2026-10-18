const cron = require('node-cron');
const ENV = require('../../../config/env');
const logger = require('../../../utils/logger');
const { runSync, isRunning, refreshLiveStatus } = require('./collector');
const { datesToCollect } = require('./dates');

/**
 * Nightly WakaTime collection (WAKA_SYNC_CRON, default 9 PM IST).
 * Each run collects today + WAKA_LOOKBACK_DAYS previous days, so work done
 * after the run is picked up complete the next night.
 * Called once when the server starts.
 */
const startWakaSyncScheduler = () => {
  if (!ENV.WAKA_SYNC_ENABLED) {
    logger.info('[wakaScheduler] disabled (WAKA_SYNC_ENABLED=false)');
    return;
  }
  if (!cron.validate(ENV.WAKA_SYNC_CRON)) {
    logger.error(`[wakaScheduler] invalid WAKA_SYNC_CRON "${ENV.WAKA_SYNC_CRON}" — not scheduled`);
    return;
  }

  cron.schedule(
    ENV.WAKA_SYNC_CRON,
    async () => {
      if (isRunning()) {
        logger.warn('[wakaScheduler] previous run still in progress, skipping this tick');
        return;
      }
      await runSync({ dates: datesToCollect(), triggeredBy: 'scheduler' }).catch((err) => {
        if (err.code === 'ALREADY_RUNNING') logger.warn(`[wakaScheduler] skipped — run ${err.runId} is still in progress`);
        else logger.error('[wakaScheduler] run crashed', err);
      });
    },
    { timezone: ENV.WAKA_TIMEZONE },
  );
  logger.info(
    `[wakaScheduler] scheduled "${ENV.WAKA_SYNC_CRON}" (${ENV.WAKA_TIMEZONE}), lookback ${ENV.WAKA_LOOKBACK_DAYS} day(s)`,
  );

  // "Working now": each developer's last activity per project, every few minutes
  if (ENV.WAKA_LIVE_CRON && cron.validate(ENV.WAKA_LIVE_CRON)) {
    cron.schedule(
      ENV.WAKA_LIVE_CRON,
      () => refreshLiveStatus().catch((err) => logger.error('[wakaLive] refresh failed', err)),
      { timezone: ENV.WAKA_TIMEZONE },
    );
    logger.info(`[wakaScheduler] live status "${ENV.WAKA_LIVE_CRON}" (${ENV.WAKA_TIMEZONE})`);
  } else if (ENV.WAKA_LIVE_CRON) {
    logger.error(`[wakaScheduler] invalid WAKA_LIVE_CRON "${ENV.WAKA_LIVE_CRON}" — live status not scheduled`);
  }
};

module.exports = { startWakaSyncScheduler };
