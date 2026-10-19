// Mail settings (non-secret), send guard and history — procedures in sql/06_E2M_Mail.sql
const { sql, execProc } = require('../../../utils/procedure');

/** Defaults — a mail type works before it is ever saved. */
const DEFAULTS = {
  weeklyReport: {
    isEnabled: true,
    settings: {
      dayOfWeek: 1, // 1 = Monday … 7 = Sunday
      time: '09:30',
      sendToDevelopers: true, // each developer: only their own week
      sendToTeamViewers: true, // users who may see every developer: the whole team
      includeIdleDevelopers: false, // also mail developers with no activity that week
      extraTeamRecipients: '', // more addresses for the team report (managers …)
    },
  },
  welcome: {
    isEnabled: true,
    settings: {
      extraNote: '', // added at the end of every welcome mail
    },
  },
};

const getSettings = async () => {
  const rows = await execProc('PRC_Get_Mail_Settings', {});
  const out = {};
  for (const [mailType, def] of Object.entries(DEFAULTS)) {
    const row = rows.find((r) => r.mailType === mailType);
    let saved = {};
    try {
      saved = row?.settingsJson ? JSON.parse(row.settingsJson) : {};
    } catch {
      saved = {};
    }
    out[mailType] = {
      mailType,
      isEnabled: row ? Boolean(row.isEnabled) : def.isEnabled,
      settings: { ...def.settings, ...saved },
      updatedBy: row?.updatedBy || '',
      updatedDate: row?.updatedDate || null,
    };
  }
  return out;
};

const getSetting = async (mailType) => (await getSettings())[mailType];

const saveSetting = (mailType, isEnabled, settings, updatedBy) =>
  execProc('PRC_Save_Mail_Setting', {
    pIN_mailType: [sql.VarChar(50), mailType],
    pIN_isEnabled: [sql.Bit, Boolean(isEnabled)],
    pIN_settingsJson: [sql.NVarChar(sql.MAX), JSON.stringify(settings)],
    pIN_updatedBy: [sql.NVarChar(100), updatedBy],
  });

/** @returns { resultCode: 'OK' | 'ALREADY_SENT', logId } */
const claimSend = async ({ mailType, periodKey, email, name, subject, triggeredBy }) =>
  (
    await execProc('PRC_Claim_Mail_Send', {
      pIN_mailType: [sql.VarChar(50), mailType],
      pIN_periodKey: [sql.VarChar(100), periodKey],
      pIN_recipientEmail: [sql.NVarChar(200), email],
      pIN_recipientName: [sql.NVarChar(150), name],
      pIN_subject: [sql.NVarChar(500), subject],
      pIN_triggeredBy: [sql.NVarChar(150), triggeredBy],
    })
  )[0];

const finishSend = (logId, status, { subject, error } = {}) =>
  execProc('PRC_Finish_Mail_Send', {
    pIN_logId: [sql.BigInt, logId],
    pIN_mailStatus: [sql.VarChar(20), status],
    pIN_subject: [sql.NVarChar(500), subject],
    pIN_errorMessage: [sql.NVarChar(2000), error ? String(error).slice(0, 2000) : null],
  });

const getLogs = ({ top, mailType } = {}) =>
  execProc('PRC_Get_Mail_Logs', { pIN_top: [sql.Int, top], pIN_mailType: [sql.VarChar(50), mailType] });

const getDeveloperRecipients = () => execProc('PRC_Get_Weekly_Developer_Recipients', {});
const getTeamRecipients = () => execProc('PRC_Get_Weekly_Team_Recipients', {});
const getSuperAdminRecipients = () => execProc('PRC_Get_Super_Admin_Recipients', {});
const getWelcomeInfo = async (userId) =>
  (await execProc('PRC_Get_User_Welcome_Info', { pIN_userId: [sql.Int, userId] }))[0];

module.exports = {
  DEFAULTS,
  getSettings,
  getSetting,
  saveSetting,
  claimSend,
  finishSend,
  getLogs,
  getDeveloperRecipients,
  getTeamRecipients,
  getSuperAdminRecipients,
  getWelcomeInfo,
};
