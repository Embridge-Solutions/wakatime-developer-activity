const { WAKATIME } = require('../../../data/statusMessage');
const { fail } = require('../../../utils');
const { safeNum } = require('../../../utils/safeParam');
const { startSync, getSyncState } = require('../helpers/collector');
const { datesToCollect, isValidDay, dayString } = require('../helpers/dates');
const store = require('../helpers/store');

const MAX_SYNC_DAYS = 14;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const clampTop = (value, fallback, max) => Math.min(Math.max(Math.trunc(safeNum(value, fallback)), 1), max);

// POST /syncNow  { developerId?, date?: 'YYYY-MM-DD', days?: 7 }
//   nothing      → today + lookback (same as the nightly run)
//   date         → that one day
//   days         → today + that many previous days (backfill, max 14)
// Runs in the background; poll GET /getSyncStatus. Refused while any run is in progress.
const syncNow = async (req, res) => {
  const { date, days } = req.body || {};
  const developerId = safeNum(req.body?.developerId);

  let dates;
  if (date) {
    if (!isValidDay(date) || date > dayString(new Date())) {
      return res.status(WAKATIME.INVALID_DATE.CODE).json({ success: false, msg: WAKATIME.INVALID_DATE.MESSAGE });
    }
    dates = [date];
  } else if (days !== undefined && days !== null && days !== '') {
    const n = safeNum(days);
    if (n === null || n < 0 || n > MAX_SYNC_DAYS || !Number.isInteger(n)) {
      return res.status(WAKATIME.INVALID_DAYS.CODE).json({ success: false, msg: WAKATIME.INVALID_DAYS.MESSAGE });
    }
    dates = datesToCollect(n);
  } else {
    dates = datesToCollect();
  }

  try {
    const { started, runId } = await startSync({
      dates,
      developerId,
      triggeredBy: `manual · ${req.user?.username || 'unknown'}`,
    });
    if (!started) {
      return res
        .status(WAKATIME.ALREADY_RUNNING.CODE)
        .json({ success: false, msg: WAKATIME.ALREADY_RUNNING.MESSAGE, data: { runId } });
    }
    return res.status(WAKATIME.SYNC_STARTED.CODE).json({
      success: true,
      msg: WAKATIME.SYNC_STARTED.MESSAGE,
      data: { runId, dates, developerId },
    });
  } catch (err) {
    return fail(res, 'syncNow', err);
  }
};

// GET /getSyncStatus → { running, runId, startedAt, triggeredBy, lastRun }
const getSyncStatus = (req, res) =>
  res.json({ success: true, msg: WAKATIME.SUCCESS.MESSAGE, data: getSyncState() });

// GET /getSyncRuns?top=50 — run history (manual + nightly, every API instance)
const getSyncRuns = async (req, res) => {
  try {
    const data = await store.getSyncRuns(clampTop(req.query.top, 50, 500));
    return res.json({ success: true, msg: WAKATIME.SUCCESS.MESSAGE, data });
  } catch (err) {
    return fail(res, 'getSyncRuns', err);
  }
};

// GET /getSyncLogs?top=200&developerId=3&syncStatus=FAILED&fromDate=2026-10-01&runId=…
const getSyncLogs = async (req, res) => {
  const { syncStatus, fromDate, runId } = req.query;
  try {
    const data = await store.getSyncLogs({
      top: clampTop(req.query.top, 200, 1000),
      developerId: safeNum(req.query.developerId),
      syncStatus,
      fromDate: fromDate && isValidDay(fromDate) ? fromDate : null,
      runId: runId && UUID_RE.test(runId) ? runId : null,
    });
    return res.json({ success: true, msg: WAKATIME.SUCCESS.MESSAGE, data });
  } catch (err) {
    return fail(res, 'getSyncLogs', err);
  }
};

module.exports = { syncNow, getSyncStatus, getSyncRuns, getSyncLogs };
