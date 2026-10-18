const { TEAM } = require('../../../data/statusMessage');
const { fail } = require('../../../utils');
const { safeNum } = require('../../../utils/safeParam');
const { sql, execProc } = require('../../../utils/procedure');

// ── Teams ──────────────────────────────────────────────────────────────────
// Procedures in sql/02_E2M_Developer_Procedures.sql. A user can be in many
// teams and a team has many users (E2M_Team_User_T).

const RESULT = { NOT_FOUND: TEAM.NOT_FOUND, NAME_EXISTS: TEAM.NAME_EXISTS };

const send = (res, status, body) => res.status(status.CODE).json({ success: status.CODE < 400, msg: status.MESSAGE, ...body });

/** [3, "7", 7, null] → "[3,7]" (unique positive ids) */
const idsJson = (ids) =>
  JSON.stringify([...new Set((Array.isArray(ids) ? ids : []).map(Number).filter((n) => Number.isInteger(n) && n > 0))]);

/** Teams list rows → memberIds as numbers. */
const shape = (row) => ({
  ...row,
  memberIds: row.memberIds ? row.memberIds.split(',').map(Number) : [],
});

const getTeamById = async (teamId) =>
  (await execProc('PRC_Get_Team_List', {})).map(shape).find((t) => t.teamId === teamId);

// GET /getTeams?activeOnly=true
const getTeams = async (req, res) => {
  try {
    const rows = await execProc('PRC_Get_Team_List', { pIN_activeOnly: [sql.Bit, req.query.activeOnly === 'true'] });
    return res.json({ success: true, msg: TEAM.SUCCESS.MESSAGE, data: rows.map(shape) });
  } catch (err) {
    return fail(res, 'getTeams', err);
  }
};

const saveTeam = async (req, res, teamId) => {
  const { teamName, description, isActive, memberIds } = req.body || {};
  if (!String(teamName ?? '').trim()) return send(res, TEAM.REQUIRED);

  const [row] = await execProc('PRC_Save_Team', {
    pIN_teamId: [sql.Int, teamId],
    pIN_teamName: [sql.NVarChar(100), String(teamName).trim()],
    pIN_description: [sql.NVarChar(500), description],
    pIN_isActive: [sql.Bit, isActive === undefined ? true : Boolean(isActive)],
    // members only replaced when the screen sends them
    pIN_memberIdsJson: [sql.NVarChar(sql.MAX), memberIds === undefined ? null : idsJson(memberIds)],
    pIN_savedBy: [sql.NVarChar(100), req.user?.username],
  });
  if (row?.resultCode !== 'OK') return send(res, RESULT[row?.resultCode] || TEAM.NOT_FOUND);
  return send(res, teamId ? TEAM.UPDATE : TEAM.CREATED, { data: await getTeamById(row.teamId) });
};

// POST /addTeam { teamName, description?, isActive?, memberIds?: [userId] }
const addTeam = async (req, res) => {
  try {
    return await saveTeam(req, res, null);
  } catch (err) {
    return fail(res, 'addTeam', err);
  }
};

// PUT /updateTeam/:id { teamName, description?, isActive?, memberIds? }
const updateTeam = async (req, res) => {
  const teamId = safeNum(req.params.id);
  if (!teamId) return send(res, TEAM.NOT_FOUND);
  try {
    return await saveTeam(req, res, teamId);
  } catch (err) {
    return fail(res, 'updateTeam', err);
  }
};

// DELETE /deleteTeam/:id — members leave the team; users and activity stay
const deleteTeam = async (req, res) => {
  const teamId = safeNum(req.params.id);
  if (!teamId) return send(res, TEAM.NOT_FOUND);
  try {
    const [row] = await execProc('PRC_Delete_Team', {
      pIN_teamId: [sql.Int, teamId],
      pIN_deletedBy: [sql.NVarChar(100), req.user?.username],
    });
    if (row?.resultCode !== 'OK') return send(res, TEAM.NOT_FOUND);
    return send(res, TEAM.DELETE);
  } catch (err) {
    return fail(res, 'deleteTeam', err);
  }
};

module.exports = { getTeams, addTeam, updateTeam, deleteTeam, idsJson };
