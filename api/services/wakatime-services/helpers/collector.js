// Collects developer-days from WakaTime and stores them through the sync procedures.
// No duplicates:
//   · only one run at a time — in this process (state.running) and across every
//     API instance (PRC_Start_Waka_Sync_Run refuses while another run is RUNNING)
//   · PRC_Save_Waka_Developer_Day replaces the (developer, date), so re-running a day never duplicates
// The nightly scheduler and "Sync now" both go through beginRun.
const crypto = require('crypto');
const ENV = require('../../../config/env');
const logger = require('../../../utils/logger');
const { decrypt } = require('./crypto');
const { WakaClient } = require('./wakaClient');
const T = require('./transform');
const store = require('./store');

const state = { running: false, runId: null, startedAt: null, triggeredBy: null, lastRun: null };

class SyncBusyError extends Error {
  constructor(runId) {
    super('A WakaTime sync is already running');
    this.code = 'ALREADY_RUNNING';
    this.runId = runId;
  }
}

const fetchDeveloperDay = async (client, date) => {
  const summaryResp = await client.summaries(date);
  const day = (summaryResp.data || [])[0] || null;

  const projectDetails = [];
  if (ENV.WAKA_FETCH_PROJECT_DETAILS && day) {
    for (const p of day.projects || []) {
      if (!p.name || p.total_seconds <= 0) continue;
      const r = await client.summaries(date, p.name);
      projectDetails.push({ project: p.name, day: (r.data || [])[0] || null });
    }
  }

  const durations = [];
  for (const slice of ENV.WAKA_DURATION_SLICES) {
    const r = await client.durations(date, slice);
    durations.push(...T.durationRows(r.data, slice));
  }

  const hbResp = await client.heartbeats(date);
  const heartbeats = T.heartbeatRows(hbResp.data);

  return {
    summary: T.summaryRow(day, heartbeats),
    rawSummaryJson: JSON.stringify({ day, projectDetails }),
    breakdown: T.breakdownRows(day, projectDetails),
    durations,
    heartbeats,
    aiModels: T.aiModelRows(day),
  };
};

/** Editors / AI tools the developer uses. Never fails the developer's sync. */
const syncUserAgents = async (client, dev) => {
  try {
    const resp = await client.userAgents();
    const agents = T.userAgentRows(resp.data);
    if (agents.length) await store.saveUserAgents(dev.developerId, agents);
  } catch (err) {
    if (err.isAuthError) throw err;
    logger.warn(`[wakaSync] ${dev.developerName}: user agents not collected — ${err.message}`);
  }
};

/** Projects with last activity + repository ("working now", project pages). Never fails the sync. */
const syncProjects = async (client, dev) => {
  try {
    const resp = await client.projects();
    const projects = T.projectRows(resp.data);
    if (projects.length) await store.saveProjects(dev.developerId, projects);
  } catch (err) {
    if (err.isAuthError) throw err;
    logger.warn(`[wakaSync] ${dev.developerName}: projects not collected — ${err.message}`);
  }
};

/**
 * Commit messages of the projects worked on in this run (first page = newest commits).
 * Only projects whose repository is connected in WakaTime have commits; others are skipped quietly.
 */
const syncCommits = async (client, dev, projectNames) => {
  for (const project of projectNames) {
    try {
      const resp = await client.commits(project);
      const commits = T.commitRows(resp.commits);
      if (commits.length) await store.saveCommits(dev.developerId, project, commits);
    } catch (err) {
      if (err.isAuthError) throw err;
      if (err.status !== 404) logger.warn(`[wakaSync] ${dev.developerName} / ${project}: commits not collected — ${err.message}`);
    }
  }
};

const syncDeveloper = async (dev, dates, ctx, result) => {
  let client;
  try {
    client = new WakaClient(decrypt(dev.wakaApiKeyEnc));
  } catch (err) {
    logger.error(`[wakaSync] ${dev.developerName}: cannot decrypt token`, err);
    for (const date of dates) {
      await store.insertSyncLog({
        ...ctx, developerId: dev.developerId, date, status: 'AUTH_ERROR', startedAt: new Date(),
        error: 'Token could not be decrypted (was WAKA_TOKEN_SECRET changed?)',
      });
    }
    result.failed += dates.length;
    return;
  }

  const workedProjects = new Set();
  let authFailed = false;
  for (const [i, date] of dates.entries()) {
    const startedAt = new Date();
    const callsBefore = client.calls;
    try {
      if (i === 0) {
        await syncUserAgents(client, dev);
        await syncProjects(client, dev);
      }
      const data = await fetchDeveloperDay(client, date);
      for (const b of data.breakdown) if (b.dimension === 'project' && b.totalSeconds > 0) workedProjects.add(b.itemName);
      await store.saveDeveloperDay(dev.developerId, date, data);
      await store.insertSyncLog({
        ...ctx, developerId: dev.developerId, date, status: 'SUCCESS', startedAt,
        apiCalls: client.calls - callsBefore,
        heartbeatCount: data.heartbeats.length,
        totalSeconds: data.summary.totalSeconds,
      });
      result.ok++;
      logger.info(
        `[wakaSync] ${dev.developerName} ${date}: ${(data.summary.totalSeconds / 3600).toFixed(2)} h, ${data.heartbeats.length} heartbeats`,
      );
    } catch (err) {
      result.failed++;
      await store
        .insertSyncLog({
          ...ctx, developerId: dev.developerId, date, startedAt,
          status: err.isAuthError ? 'AUTH_ERROR' : 'FAILED',
          apiCalls: client.calls - callsBefore,
          error: err.message,
        })
        .catch((e) => logger.error('[wakaSync] could not write sync log', e));
      logger.error(`[wakaSync] ${dev.developerName} ${date}: FAILED`, err);
      if (err.isAuthError) {
        authFailed = true;
        break; // token revoked: skip this developer's remaining dates
      }
    }
  }

  if (ENV.WAKA_FETCH_COMMITS && !authFailed && workedProjects.size) {
    await syncCommits(client, dev, workedProjects).catch((err) =>
      logger.warn(`[wakaSync] ${dev.developerName}: commits stopped — ${err.message}`),
    );
  }
};

/**
 * Reserves the run (process + database). @returns { started, runId } — runId is the
 * run already in progress when started is false.
 */
const beginRun = async ({ dates, developerId, triggeredBy = 'scheduler' }) => {
  if (state.running) return { started: false, runId: state.runId };
  state.running = true; // reserved before the first await, so two callers can't both pass

  const runId = crypto.randomUUID();
  try {
    const row = await store.startRun({ runId, triggeredBy, developerId, dates });
    if (row?.resultCode !== 'OK') {
      state.running = false;
      return { started: false, runId: row?.runId || null };
    }
  } catch (err) {
    state.running = false;
    throw err;
  }
  Object.assign(state, { runId, startedAt: new Date(), triggeredBy });
  return { started: true, runId };
};

const executeRun = async (runId, { dates, developerId, triggeredBy = 'scheduler' }) => {
  const result = { runId, triggeredBy, dates, developers: 0, ok: 0, failed: 0 };
  try {
    const devs = await store.getDevelopersForSync(developerId);
    result.developers = devs.length;
    logger.info(`[wakaSync] run ${runId} (${triggeredBy}): ${devs.length} developer(s), dates ${dates.join(', ')}`);

    for (const dev of devs) {
      await syncDeveloper(dev, dates, { runId, triggeredBy }, result);
    }
    logger.info(`[wakaSync] run ${runId} finished: ${result.ok} ok, ${result.failed} failed`);
    return result;
  } catch (err) {
    result.error = err.message;
    throw err;
  } finally {
    await store
      .finishRun({
        runId,
        status: result.error ? 'FAILED' : 'COMPLETED',
        developers: result.developers,
        ok: result.ok,
        failed: result.failed,
        error: result.error,
      })
      .catch((e) => logger.error('[wakaSync] could not close the run', e));
    state.running = false;
    state.lastRun = { ...result, startedAt: state.startedAt, finishedAt: new Date() };
  }
};

/**
 * Collects the given dates for every active developer (or one developer) and waits for the end.
 * @throws SyncBusyError when another run is in progress
 */
const runSync = async (options) => {
  const { started, runId } = await beginRun(options);
  if (!started) throw new SyncBusyError(runId);
  return executeRun(runId, options);
};

/** Starts a run in the background (API "Sync now"). @returns { started, runId } */
const startSync = async (options) => {
  const begun = await beginRun(options);
  if (begun.started) {
    executeRun(begun.runId, options).catch((err) => logger.error('[wakaSync] run crashed', err));
  }
  return begun;
};

const getSyncState = () => ({
  running: state.running,
  runId: state.running ? state.runId : null,
  startedAt: state.running ? state.startedAt : null,
  triggeredBy: state.running ? state.triggeredBy : null,
  lastRun: state.lastRun,
});

const isRunning = () => state.running;

/* ─── Live status ───────────────────────────────────────────────────────────
   Every few minutes (WAKA_LIVE_CRON): one call per developer to
   /users/current/projects — last activity per project — so the dashboards can
   show who is working now and on what. Outside the sync lock: it only updates
   E2M_Waka_Project_T (merge), so it can't duplicate anything. */

let liveRunning = false;

const refreshLiveStatus = async () => {
  if (liveRunning) return { skipped: true };
  liveRunning = true;
  const result = { developers: 0, ok: 0, failed: 0 };
  try {
    const devs = await store.getDevelopersForSync();
    result.developers = devs.length;
    for (const dev of devs) {
      try {
        const client = new WakaClient(decrypt(dev.wakaApiKeyEnc));
        const resp = await client.projects();
        const projects = T.projectRows(resp.data);
        if (projects.length) await store.saveProjects(dev.developerId, projects);
        result.ok++;
      } catch (err) {
        result.failed++; // a rejected token is reported by the nightly sync
      }
    }
    return result;
  } finally {
    liveRunning = false;
  }
};

module.exports = { runSync, startSync, getSyncState, isRunning, fetchDeveloperDay, refreshLiveStatus, SyncBusyError };
