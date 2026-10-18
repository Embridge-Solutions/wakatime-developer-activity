/**
 * ─── Safe SQL Parameter Utilities ───────────────────────────────────────────
 * Prevents crashes and SQL injection from null, undefined, empty, or malicious
 * values when building stored procedure query strings.
 *
 *   safeStr / safeNum / safeDate → cleaned JS value (or the fallback)
 *   sqlStr  / sqlNum  / sqlDate  → ready-to-use SQL value: 'text' | 12 | NULL
 *
 * Usage (preferred — no manual quotes, empty values become NULL):
 *   const { sqlStr, sqlNum, sqlDate } = require('../utils/safeParam');
 *   db.sequelize.query(`PRC_Insert_X ${sqlNum(id)}, ${sqlStr(name)}, ${sqlDate(startTime)}`);
 */

"use strict";

/** true for null / undefined / '' / 'undefined' / 'null' */
const isEmpty = (val) =>
  val === null ||
  val === undefined ||
  ["", "undefined", "null"].includes(String(val).trim());

/**
 * Safe string — trims and escapes single quotes.
 * @returns {string|null} cleaned string (without quotes) or fallback
 */
const safeStr = (val, fallback = null) => {
  if (isEmpty(val)) return fallback;
  return String(val).trim().replace(/'/g, "''");
};

/**
 * Safe number — returns fallback for null/undefined/empty/NaN.
 * @returns {number|null}
 */
const safeNum = (val, fallback = null) => {
  if (isEmpty(val)) return fallback;
  const num = Number(val);
  return Number.isFinite(num) ? num : fallback;
};

/**
 * Safe date — accepts Date objects and any parsable date string
 * ('2026-10-03', '2026-10-03 08:00:00', '2026-10-03T08:00:00'…).
 * @returns {string|null} escaped date string or fallback for invalid input
 */
const safeDate = (val, fallback = null) => {
  if (isEmpty(val)) return fallback;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return fallback;
    const p = (n) => String(n).padStart(2, "0");
    return `${val.getFullYear()}-${p(val.getMonth() + 1)}-${p(val.getDate())} ${p(val.getHours())}:${p(val.getMinutes())}:${p(val.getSeconds())}`;
  }
  const str = String(val).trim();
  return isNaN(Date.parse(str)) ? fallback : str.replace(/'/g, "''");
};

/** SQL string literal: 'text' or NULL */
const sqlStr = (val, fallback = null) => {
  const str = safeStr(val, fallback === null ? null : String(fallback).replace(/'/g, "''"));
  return str === null ? "NULL" : `'${str}'`;
};

/** SQL number: 12 or NULL */
const sqlNum = (val, fallback = null) => {
  const num = safeNum(val, fallback);
  return num === null ? "NULL" : num;
};

/** SQL date literal: '2026-10-03 08:00:00' or NULL */
const sqlDate = (val, fallback = null) => {
  const date = safeDate(val, fallback);
  return date === null ? "NULL" : `'${date}'`;
};

module.exports = {
  isEmpty,
  safeStr,
  safeNum,
  safeDate,
  sqlStr,
  sqlNum,
  sqlDate,
};
