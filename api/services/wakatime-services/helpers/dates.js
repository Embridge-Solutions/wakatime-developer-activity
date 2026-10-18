// Date helpers that always work in the business timezone (WAKA_TIMEZONE, IST by default).
const ENV = require('../../../config/env');

// en-CA formats as YYYY-MM-DD
const dayString = (date, tz = ENV.WAKA_TIMEZONE) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);

const shiftDay = (yyyyMmDd, deltaDays) => {
  const d = new Date(`${yyyyMmDd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
};

/** Today plus `lookback` previous days, oldest first. */
const datesToCollect = (lookback = ENV.WAKA_LOOKBACK_DAYS, now = new Date()) => {
  const today = dayString(now);
  const out = [];
  for (let i = lookback; i >= 0; i--) out.push(shiftDay(today, -i));
  return out;
};

const isValidDay = (s) =>
  /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(`${s}T00:00:00Z`).getTime());

module.exports = { dayString, shiftDay, datesToCollect, isValidDay };
