/**
 * ─── Stored procedure runner ────────────────────────────────────────────────
 * Calls a procedure with typed, named parameters through the mssql pool —
 * no string building, so quotes and large JSON payloads are safe.
 *
 * Usage:
 *   const { sql, execProc } = require('../utils/procedure');
 *   const rows = await execProc('PRC_Get_Developer_List', {
 *     pIN_status: [sql.VarChar(10), 'ACTIVE'],
 *     pIN_developerId: [sql.Int, 3],
 *   });
 *
 * undefined / '' → NULL, so the procedure's default or NULL handling applies.
 */

'use strict';

const sql = require('mssql');
const { poolPromise } = require('../communications/models');

/** @returns {Promise<object[]>} the first result set */
const execProc = async (name, params = {}) => {
  const pool = await poolPromise;
  const request = pool.request();
  for (const [key, [type, value]] of Object.entries(params)) {
    request.input(key, type, value === undefined || value === '' ? null : value);
  }
  const result = await request.execute(name);
  return result.recordset || [];
};

module.exports = { sql, execProc };
