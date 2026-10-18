// SQL Server access for the WakaTime sync — procedures in sql/03_E2M_WakaTime_Sync_Procedures.sql
const { sql, execProc } = require('../../../utils/procedure');

/** @returns { resultCode: 'OK' | 'ALREADY_RUNNING', runId } */
const startRun = async ({ runId, triggeredBy, developerId, dates }) =>
  (
    await execProc('PRC_Start_Waka_Sync_Run', {
      pIN_runId: [sql.UniqueIdentifier, runId],
      pIN_triggeredBy: [sql.NVarChar(150), triggeredBy],
      pIN_developerId: [sql.Int, developerId],
      pIN_activityDates: [sql.NVarChar(400), (dates || []).join(',').slice(0, 400)],
    })
  )[0];

const finishRun = ({ runId, status, developers, ok, failed, error }) =>
  execProc('PRC_Finish_Waka_Sync_Run', {
    pIN_runId: [sql.UniqueIdentifier, runId],
    pIN_runStatus: [sql.VarChar(20), status],
    pIN_developerCount: [sql.Int, developers],
    pIN_okCount: [sql.Int, ok],
    pIN_failedCount: [sql.Int, failed],
    pIN_errorMessage: [sql.NVarChar(2000), error ? String(error).slice(0, 2000) : null],
  });

const getSyncRuns = (top) => execProc('PRC_Get_Waka_Sync_Runs', { pIN_top: [sql.Int, top] });

const getDevelopersForSync = (developerId) =>
  execProc('PRC_Get_Developers_For_Waka_Sync', {
    pIN_developerId: [sql.Int, developerId],
  });

/** Replaces one developer-day (one transaction inside the procedure). */
const saveDeveloperDay = async (developerId, date, data) => {
  const rows = await execProc('PRC_Save_Waka_Developer_Day', {
    pIN_developerId: [sql.Int, developerId],
    pIN_activityDate: [sql.Date, date],
    pIN_summaryJson: [sql.NVarChar(sql.MAX), JSON.stringify(data.summary)],
    pIN_rawSummaryJson: [sql.NVarChar(sql.MAX), data.rawSummaryJson],
    pIN_breakdownJson: [sql.NVarChar(sql.MAX), JSON.stringify(data.breakdown)],
    pIN_durationsJson: [sql.NVarChar(sql.MAX), JSON.stringify(data.durations)],
    pIN_heartbeatsJson: [sql.NVarChar(sql.MAX), JSON.stringify(data.heartbeats)],
    pIN_aiModelsJson: [sql.NVarChar(sql.MAX), JSON.stringify(data.aiModels || [])],
  });
  return rows[0];
};

const saveUserAgents = (developerId, agents) =>
  execProc('PRC_Save_Waka_User_Agents', {
    pIN_developerId: [sql.Int, developerId],
    pIN_agentsJson: [sql.NVarChar(sql.MAX), JSON.stringify(agents)],
  });

const saveProjects = (developerId, projects) =>
  execProc('PRC_Save_Waka_Projects', {
    pIN_developerId: [sql.Int, developerId],
    pIN_projectsJson: [sql.NVarChar(sql.MAX), JSON.stringify(projects)],
  });

const saveCommits = (developerId, projectName, commits) =>
  execProc('PRC_Save_Waka_Commits', {
    pIN_developerId: [sql.Int, developerId],
    pIN_projectName: [sql.NVarChar(400), projectName],
    pIN_commitsJson: [sql.NVarChar(sql.MAX), JSON.stringify(commits)],
  });

const insertSyncLog = (entry) =>
  execProc('PRC_Insert_Waka_Sync_Log', {
    pIN_runId: [sql.UniqueIdentifier, entry.runId],
    pIN_developerId: [sql.Int, entry.developerId],
    pIN_activityDate: [sql.Date, entry.date],
    pIN_syncStatus: [sql.VarChar(20), entry.status],
    pIN_triggeredBy: [sql.NVarChar(150), entry.triggeredBy],
    pIN_apiCalls: [sql.Int, entry.apiCalls],
    pIN_heartbeatCount: [sql.Int, entry.heartbeatCount],
    pIN_totalSeconds: [sql.Float, entry.totalSeconds],
    pIN_errorMessage: [sql.NVarChar(2000), entry.error ? String(entry.error).slice(0, 2000) : null],
    pIN_startedDate: [sql.DateTime, entry.startedAt],
  });

const getSyncLogs = ({ top, developerId, syncStatus, fromDate, runId } = {}) =>
  execProc('PRC_Get_Waka_Sync_Logs', {
    pIN_top: [sql.Int, top],
    pIN_developerId: [sql.Int, developerId],
    pIN_syncStatus: [sql.VarChar(20), syncStatus],
    pIN_fromDate: [sql.Date, fromDate],
    pIN_runId: [sql.UniqueIdentifier, runId],
  });

module.exports = {
  startRun,
  finishRun,
  getSyncRuns,
  getDevelopersForSync,
  saveDeveloperDay,
  saveUserAgents,
  saveProjects,
  saveCommits,
  insertSyncLog,
  getSyncLogs,
};
