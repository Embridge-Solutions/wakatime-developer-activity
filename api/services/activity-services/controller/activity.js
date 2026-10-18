const ENV = require('../../../config/env');
const { ACTIVITY } = require('../../../data/statusMessage');
const { fail } = require('../../../utils');
const { safeNum } = require('../../../utils/safeParam');
const { sql, execProc } = require('../../../utils/procedure');
const { canViewAll } = require('../../../communications/middleware/access');
const { dayString, shiftDay, isValidDay } = require('../../wakatime-services/helpers/dates');

// ── Dashboards & reports ───────────────────────────────────────────────────
// Procedures in sql/04_E2M_Activity_Dashboard_Procedures.sql.
// activity_viewall scope (admins): every developer, optional developerId / teamId filter.
// Anyone else: only the developer linked to their login (E2M_Developer_M.userId).

const MAX_RANGE_DAYS = 366;
const DIMENSIONS = ['project', 'language', 'editor', 'category', 'operating_system', 'machine', 'dependency', 'branch', 'entity'];

// bigint totals arrive from mssql as strings ("1050") — the screens get numbers
const BIGINT_KEYS = ['heartbeatCount', 'aiInputTokens', 'aiOutputTokens', 'inputTokens', 'outputTokens', 'cachedInputTokens'];
const toNumbers = (row) => {
  if (!row || typeof row !== 'object') return row;
  const out = { ...row };
  for (const key of BIGINT_KEYS) if (typeof out[key] === 'string') out[key] = Number(out[key]);
  return out;
};

const send = (res, status) => res.status(status.CODE).json({ success: false, msg: status.MESSAGE });
const ok = (res, data, extra = {}) =>
  res.json({ success: true, msg: ACTIVITY.SUCCESS.MESSAGE, data: Array.isArray(data) ? data.map(toNumbers) : toNumbers(data), ...extra });

/** fromDate / toDate (default: last 7 days incl. today, IST). @returns { fromDate, toDate } or null */
const readRange = (query) => {
  const today = dayString(new Date());
  const toDate = query.toDate || today;
  const fromDate = query.fromDate || shiftDay(toDate, -6);
  if (!isValidDay(fromDate) || !isValidDay(toDate) || fromDate > toDate) return null;
  const days = (new Date(`${toDate}T00:00:00Z`) - new Date(`${fromDate}T00:00:00Z`)) / 86400000 + 1;
  return days > MAX_RANGE_DAYS ? null : { fromDate, toDate };
};

/**
 * Which developers the caller may see.
 * @returns {{ isAdmin, developerId, teamId, developer }} or null when a login without activity_viewall has no developer
 *          (isAdmin = may see every developer)
 */
const resolveScope = async (req) => {
  const [own] = await execProc('PRC_Get_Developer_By_User', { pIN_userId: [sql.Int, req.user?.id] });
  if (canViewAll(req)) {
    return { isAdmin: true, developerId: safeNum(req.query.developerId), teamId: safeNum(req.query.teamId), developer: own || null };
  }
  if (!own) return null;
  return { isAdmin: false, developerId: own.developerId, teamId: null, developer: own };
};

/**
 * Wraps a handler: validates range + scope, then calls handler({ range, scope, base }) where
 * `base` are the common procedure parameters.
 */
const withFilters = (name, handler, { withTimeZone = false } = {}) => async (req, res) => {
  const range = readRange(req.query);
  if (!range) return send(res, ACTIVITY.INVALID_RANGE);
  try {
    const scope = await resolveScope(req);
    if (!scope) return send(res, ACTIVITY.NOT_LINKED);
    const base = {
      pIN_fromDate: [sql.Date, range.fromDate],
      pIN_toDate: [sql.Date, range.toDate],
      pIN_developerId: [sql.Int, scope.developerId],
      pIN_teamId: [sql.Int, scope.teamId],
      ...(withTimeZone ? { pIN_timeZone: [sql.VarChar(60), ENV.SQL_TIME_ZONE] } : {}),
    };
    return await handler({ req, res, range, scope, base });
  } catch (err) {
    return fail(res, name, err);
  }
};

// GET /getScope — who am I on the dashboards: admin (all developers) or my own developer
const getScope = async (req, res) => {
  try {
    const scope = await resolveScope(req);
    return ok(res, {
      isAdmin: Boolean(scope?.isAdmin),
      linked: Boolean(scope?.developer),
      developer: scope?.developer || null,
      today: dayString(new Date()),
      activeMinutes: ENV.WAKA_ACTIVE_MINUTES,
    });
  } catch (err) {
    return fail(res, 'getScope', err);
  }
};

// GET /getSummary — KPI tiles, with the previous period of the same length
const getSummary = withFilters('getSummary', async ({ res, range, base }) => {
  const [row] = await execProc('PRC_Get_Activity_Summary', base);
  return ok(res, row || null, { range });
});

// GET /getDaily — one row per developer per day
const getDaily = withFilters(
  'getDaily',
  async ({ res, range, base }) => ok(res, await execProc('PRC_Get_Activity_Daily', base), { range }),
  { withTimeZone: true },
);

// GET /getBreakdown?dimension=language&projectName=&top=50
const getBreakdown = withFilters('getBreakdown', async ({ req, res, range, base }) => {
  const dimension = String(req.query.dimension || 'project');
  if (!DIMENSIONS.includes(dimension)) return send(res, ACTIVITY.INVALID_DIMENSION);
  const data = await execProc('PRC_Get_Activity_Breakdown', {
    ...base,
    pIN_dimension: [sql.VarChar(30), dimension],
    pIN_projectName: [sql.NVarChar(400), req.query.projectName],
    pIN_top: [sql.Int, Math.min(Math.max(Math.trunc(safeNum(req.query.top, 50)), 1), 500)],
  });
  return ok(res, data, { range, dimension });
});

// GET /getDevelopers — leaderboard / team report
const getDevelopers = withFilters(
  'getDevelopers',
  async ({ res, range, base }) => ok(res, await execProc('PRC_Get_Activity_Developers', base), { range }),
  { withTimeZone: true },
);

// GET /getAiModels — lines, tokens and cost per AI model
const getAiModels = withFilters('getAiModels', async ({ res, range, base }) =>
  ok(res, await execProc('PRC_Get_Activity_AI_Models', base), { range }),
);

// GET /getAgents — editors / AI tools with AI vs human lines and detected models
const getAgents = withFilters(
  'getAgents',
  async ({ res, range, base }) => ok(res, await execProc('PRC_Get_Activity_Agents', base), { range }),
  { withTimeZone: true },
);

// GET /getHourly — weekday × hour heatmap
const getHourly = withFilters(
  'getHourly',
  async ({ res, range, base }) => ok(res, await execProc('PRC_Get_Activity_Hourly', base), { range }),
  { withTimeZone: true },
);

// GET /getTimeline?developerId=3&date=2026-10-17&sliceBy=project — one developer-day
const getTimeline = async (req, res) => {
  const { date } = req.query;
  try {
    const scope = await resolveScope(req);
    if (!scope) return send(res, ACTIVITY.NOT_LINKED);
    const developerId = scope.isAdmin ? safeNum(req.query.developerId) : scope.developerId;
    if (!developerId || !date || !isValidDay(date)) return send(res, ACTIVITY.DEVELOPER_REQUIRED);

    const data = await execProc('PRC_Get_Activity_Timeline', {
      pIN_developerId: [sql.Int, developerId],
      pIN_activityDate: [sql.Date, date],
      pIN_sliceBy: [sql.VarChar(30), req.query.sliceBy],
      pIN_timeZone: [sql.VarChar(60), ENV.SQL_TIME_ZONE],
    });
    return ok(res, data, { developerId, date });
  } catch (err) {
    return fail(res, 'getTimeline', err);
  }
};

/* ─── Live status & projects ───────────────────────────────────────────── */

const live = () => ({ pIN_activeMinutes: [sql.Int, ENV.WAKA_ACTIVE_MINUTES], pIN_timeZone: [sql.VarChar(60), ENV.SQL_TIME_ZONE] });

/** ?projectName= — required by the project detail endpoints */
const projectOf = (req) => String(req.query.projectName ?? '').trim();

// GET /getLive — who is working now (last activity within WAKA_ACTIVE_MINUTES) and on what
const getLive = async (req, res) => {
  try {
    const scope = await resolveScope(req);
    if (!scope) return send(res, ACTIVITY.NOT_LINKED);
    const data = await execProc('PRC_Get_Activity_Live', {
      pIN_developerId: [sql.Int, scope.developerId],
      pIN_teamId: [sql.Int, scope.teamId],
      pIN_today: [sql.Date, dayString(new Date())],
      ...live(),
    });
    return ok(res, data, { activeMinutes: ENV.WAKA_ACTIVE_MINUTES });
  } catch (err) {
    return fail(res, 'getLive', err);
  }
};

// GET /getProjects — every project: time, developers, AI, branches, commits, working now
const getProjects = withFilters('getProjects', async ({ res, range, base }) => {
  const { pIN_timeZone: _tz, ...rest } = base;
  return ok(res, await execProc('PRC_Get_Activity_Projects', { ...rest, ...live() }), { range });
});

// GET /getProjectDevelopers?projectName=
const getProjectDevelopers = withFilters('getProjectDevelopers', async ({ req, res, range, base }) => {
  const projectName = projectOf(req);
  if (!projectName) return send(res, ACTIVITY.PROJECT_REQUIRED);
  return ok(res, await execProc('PRC_Get_Project_Developers', { ...base, pIN_projectName: [sql.NVarChar(400), projectName], ...live() }), { range });
});

// GET /getProjectDaily?projectName= — hours per developer per day (same shape as getDaily)
const getProjectDaily = withFilters('getProjectDaily', async ({ req, res, range, base }) => {
  const projectName = projectOf(req);
  if (!projectName) return send(res, ACTIVITY.PROJECT_REQUIRED);
  return ok(res, await execProc('PRC_Get_Project_Daily', { ...base, pIN_projectName: [sql.NVarChar(400), projectName] }), { range });
});

// GET /getProjectBranches?projectName= — branches with status ACTIVE / IDLE / STALE
const getProjectBranches = withFilters(
  'getProjectBranches',
  async ({ req, res, range, base }) => {
    const projectName = projectOf(req);
    if (!projectName) return send(res, ACTIVITY.PROJECT_REQUIRED);
    return ok(
      res,
      await execProc('PRC_Get_Project_Branches', {
        ...base,
        pIN_projectName: [sql.NVarChar(400), projectName],
        pIN_today: [sql.Date, dayString(new Date())],
      }),
      { range },
    );
  },
  { withTimeZone: true },
);

// GET /getProjectCommits?projectName=&branch=&top=100 — commit messages
const getProjectCommits = async (req, res) => {
  const range = readRange(req.query);
  if (!range) return send(res, ACTIVITY.INVALID_RANGE);
  const projectName = projectOf(req);
  if (!projectName) return send(res, ACTIVITY.PROJECT_REQUIRED);
  try {
    const scope = await resolveScope(req);
    if (!scope) return send(res, ACTIVITY.NOT_LINKED);
    let data = await execProc('PRC_Get_Project_Commits', {
      pIN_projectName: [sql.NVarChar(400), projectName],
      pIN_fromDate: [sql.Date, range.fromDate],
      pIN_toDate: [sql.Date, range.toDate],
      pIN_branch: [sql.NVarChar(400), req.query.branch],
      pIN_top: [sql.Int, Math.min(Math.max(Math.trunc(safeNum(req.query.top, 100)), 1), 500)],
      pIN_timeZone: [sql.VarChar(60), ENV.SQL_TIME_ZONE],
    });
    // Without activity_viewall: only the user's own commits
    if (!scope.isAdmin) data = data.filter((c) => c.developerName === scope.developer?.developerName);
    return ok(res, data, { range });
  } catch (err) {
    return fail(res, 'getProjectCommits', err);
  }
};

module.exports = {
  getLive,
  getProjects,
  getProjectDevelopers,
  getProjectDaily,
  getProjectBranches,
  getProjectCommits,
  getScope,
  getSummary,
  getDaily,
  getBreakdown,
  getDevelopers,
  getAiModels,
  getAgents,
  getHourly,
  getTimeline,
};
