const bcrypt = require('bcrypt');
const { db } = require('../../../communications/models');
const {
  USER,
  COMMON,
  INTERNAL_SERVER_ERROR,
} = require('../../../data/statusMessage');
const {
  getUniqueUsers,
  getUniqueUsersWithScopes,
} = require('../../../utils');
const logger = require('../../../utils/logger');
const { sql, execProc } = require('../../../utils/procedure');
const { verifyAndEncrypt, RESULT: DEVELOPER_RESULT } = require('../../developer-services/controller/developer');
const { idsJson } = require('../../team-services/controller/team');
const { sendWelcomeMail } = require('../../mail-services/helpers/welcome');
const { sendTokenChangedMail } = require('../../mail-services/helpers/events');
const guard = require('../../security-services/helpers/tokenGuard');

// ─── WAKATIME + TEAMS OF A USER ───────────────────────────────────────────────
// One user = one login + (optionally) a tracked developer + teams. The developer
// row (E2M_Developer_M) stays in the backend; the screens only see `user.wakatime`.
//
// Body (add / update):
//   teamIds:  [1, 4]                       → replaces the user's teams (omit = unchanged)
//   wakatime: { track: true, developerCode, designation, apiKey? }   (omit = unchanged)

const displayName = (u) => `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.username;

/** Creates / updates / links the developer row. @returns { error } or { developerId } */
const saveDeveloperOf = async (user, wakatime, savedBy) => {
  const [row] = await execProc('PRC_Save_User_Developer', {
    pIN_userId: [sql.Int, user.id],
    pIN_developerName: [sql.NVarChar(150), displayName(user)],
    pIN_email: [sql.NVarChar(200), user.email || `${user.username}@users.local`],
    pIN_developerCode: [sql.VarChar(30), wakatime.developerCode],
    pIN_designation: [sql.NVarChar(100), wakatime.designation],
    pIN_phone: [sql.VarChar(20), user.phone],
    pIN_isActive: [sql.Bit, Boolean(wakatime.track)],
    pIN_savedBy: [sql.NVarChar(100), savedBy],
  });
  if (row?.resultCode !== 'OK') return { error: DEVELOPER_RESULT[row?.resultCode] || INTERNAL_SERVER_ERROR };
  return { developerId: row.developerId };
};

const saveTeamsOf = (userId, teamIds, savedBy) =>
  execProc('PRC_Save_User_Teams', {
    pIN_userId: [sql.Int, userId],
    pIN_teamIdsJson: [sql.NVarChar(sql.MAX), idsJson(teamIds)],
    pIN_savedBy: [sql.NVarChar(100), savedBy],
  });

/** userId → { teams: [{ teamId, teamName }], wakatime: {...} | null } for the user list */
const loadUserExtras = async () => {
  const [developers, memberships] = await Promise.all([
    execProc('PRC_Get_Developer_List', { pIN_status: [sql.VarChar(10), 'ALL'] }),
    execProc('PRC_Get_User_Teams', {}),
  ]);
  const extras = new Map();
  const get = (userId) => extras.get(userId) ?? extras.set(userId, { teams: [], wakatime: null }).get(userId);
  for (const m of memberships) get(m.userId).teams.push({ teamId: m.teamId, teamName: m.teamName });
  for (const d of developers) {
    if (!d.userId) continue;
    get(d.userId).wakatime = {
      developerId: d.developerId,
      track: d.isActive,
      developerCode: d.developerCode,
      designation: d.designation,
      hasApiKey: d.hasApiKey,
      apiKeyHint: d.apiKeyHint,
      keyStatus: d.keyStatus,
      wakaUsername: d.wakaUsername,
      wakaTimezone: d.wakaTimezone,
      lastSyncDate: d.lastSyncDate,
      lastSyncStatus: d.lastSyncStatus,
    };
  }
  return extras;
};

const withExtras = async (users) => {
  const extras = await loadUserExtras();
  return users.map((u) => ({ ...u, ...(extras.get(u.id) ?? { teams: [], wakatime: null }) }));
};

// ─── GET ALL USERS ────────────────────────────────────────────────────────────
const getUsers = async (req, res) => {
  try {
    const users = await db.E2M_User.findAll({
      where: { isActive: false },
      include: [
        {
          model: db.E2M_Role,
          as: 'roles',
          attributes: ['id', 'role'],
          where: { isActive: false },
          required: false,
          include: [
            {
              model: db.E2M_Scopes,
              as: 'scopes',
              attributes: ['id', 'scope'],
              where: { isActive: false },
              required: false,
            },
          ],
        },
      ],
      attributes: { exclude: ['password'] },
      raw: true,
      nest: true,
    });

    const result = await withExtras(getUniqueUsersWithScopes(users));

    return res.json({
      success: true,
      msg: COMMON.SUCCESS.MESSAGE,
      data: result,
    });
  } catch (err) {
    console.error('[getUsers] error:', err);
    logger.error('[getUsers] error:', err);
    return res
      .status(INTERNAL_SERVER_ERROR.CODE)
      .json({ msg: INTERNAL_SERVER_ERROR.MESSAGE });
  }
};

// ─── ADD USER ─────────────────────────────────────────────────────────────────
const addUser = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const {
      username,
      firstName,
      gender,
      lastName,
      email,
      phone,
      location,
      password,
      roleIds,
      teamIds,
      wakatime,
    } = req.body;

    // Token first: a rejected token stops here, before anything is created
    let token = null;
    if (wakatime?.track && String(wakatime.apiKey ?? '').trim()) {
      // Setting a token needs the token protection password (Settings › Security)
      const problem = await guard.checkTokenPassword(req, wakatime.confirmPassword);
      if (problem) {
        await transaction.rollback();
        return res.status(problem.CODE).json({ msg: problem.MESSAGE });
      }
      token = await verifyAndEncrypt(wakatime.apiKey);
      if (token.error) {
        await transaction.rollback();
        return res.status(token.error.CODE).json({ msg: token.error.MESSAGE, detail: token.detail });
      }
    }

    const existingUser = await db.E2M_User.findOne({
      where: { username, isActive: false },
      raw: true,
      transaction,
    });

    if (existingUser) {
      await transaction.rollback();
      return res
        .status(USER.ALREADY_EXISTS.CODE)
        .json({ msg: USER.ALREADY_EXISTS.MESSAGE });
    }

    // const existingUserEmail = await db.E2M_User.findOne({
    //   where: { email, isActive: false },
    //   raw: true,
    //   transaction,
    // });

    // if (existingUserEmail) {
    //   await transaction.rollback();
    //   return res
    //     .status(USER.EMAIL_ALREADY_EXISTS.CODE)
    //     .json({ msg: USER.EMAIL_ALREADY_EXISTS.MESSAGE });
    // }

    const hashedPassword = await bcrypt.hash(password || 'Welcome@123', 10);

    const user = await db.E2M_User.create(
      {
        username,
        firstName,
        lastName,
        email,
        phone,
        gender,
        location,
        password: hashedPassword,
        isActive: false,
      },
      { transaction },
    );

    if (roleIds && roleIds.length > 0) {
      await user.setRoles(roleIds, { transaction });
    }

    // Session row is part of creating the user — same transaction
    await db.E2M_UserSession.create(
      {
        userId: user.id,
        isActive: false,
      },
      { transaction },
    );

    await transaction.commit();

    // Read back after commit (outside the transaction, so it isn't blocked by its locks)
    const createdUser = await db.E2M_User.findAll({
      where: { id: user.id, isActive: false },
      include: [
        {
          model: db.E2M_Role,
          as: 'roles',
          attributes: ['id', 'role'],
          where: { isActive: false },
          required: false,
        },
      ],
      attributes: { exclude: ['password'] },
      raw: true,
    });

    // Teams + WakaTime developer. A conflict here (e-mail / code / WakaTime account
    // already used by another developer) removes the new login again.
    const savedBy = req.user?.username;
    const undoUser = async () => {
      await execProc('PRC_Remove_User_Links', { pIN_userId: [sql.Int, user.id], pIN_deletedBy: [sql.NVarChar(100), savedBy] });
      await db.E2M_User.update({ isActive: true }, { where: { id: user.id } });
    };
    let warning = null;
    try {
      if (Array.isArray(teamIds)) await saveTeamsOf(user.id, teamIds, savedBy);
      if (wakatime?.track) {
        const dev = await saveDeveloperOf(user.get({ plain: true }), wakatime, savedBy);
        if (dev.error) {
          await undoUser();
          return res.status(dev.error.CODE).json({ msg: dev.error.MESSAGE });
        }
        if (token && dev.developerId) {
          const [keyRow] = await execProc('PRC_Update_Developer_Api_Key', {
            pIN_developerId: [sql.Int, dev.developerId],
            ...token.params,
            pIN_updatedBy: [sql.NVarChar(100), savedBy],
          });
          if (keyRow?.resultCode !== 'OK') {
            await undoUser();
            const status = DEVELOPER_RESULT[keyRow?.resultCode] || INTERNAL_SERVER_ERROR;
            return res.status(status.CODE).json({ msg: status.MESSAGE });
          }
          warning = token.account.timezoneWarning;
          const devRow = (await execProc('PRC_Get_Developer_List', { pIN_developerId: [sql.Int, dev.developerId] }))[0];
          if (devRow) sendTokenChangedMail({ developer: devRow, action: 'SET', changedBy: savedBy, via: 'New user' });
        }
      }
    } catch (linkErr) {
      await undoUser().catch(() => {});
      throw linkErr;
    }

    const result = await withExtras(getUniqueUsers(createdUser));

    // Welcome mail with the next steps (Settings › Welcome Mail); never fails the save
    const mail = await sendWelcomeMail(user.id, { triggeredBy: `user created · ${savedBy}` });

    return res
      .status(USER.CREATED.CODE)
      .json({ msg: USER.CREATED.MESSAGE, data: result, warning, mail });
  } catch (err) {
    if (!transaction.finished) await transaction.rollback();
    console.error('[addUser] error:', err);
    logger.error('[addUser] error:', err);
    return res
      .status(INTERNAL_SERVER_ERROR.CODE)
      .json({ msg: INTERNAL_SERVER_ERROR.MESSAGE });
  }
};

// ─── UPDATE USER ──────────────────────────────────────────────────────────────
const updateUser = async (req, res) => {
  const transaction = await db.sequelize.transaction();
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      username,
      email,
      phone,
      location,
      roleIds,
      removedRoleIds,
      teamIds,
      wakatime,
    } = req.body;

    const existingUser = await db.E2M_User.findOne({
      where: { id, isActive: false },
      raw: true,
      transaction,
    });

    if (!existingUser) {
      await transaction.rollback();
      return res
        .status(USER.USER_NOT_FOUND.CODE)
        .json({ msg: USER.USER_NOT_FOUND.MESSAGE });
    }

    const existingUserName = await db.E2M_User.findOne({
      where: { username, isActive: false },
      raw: true,
      transaction,
    });

    if (existingUserName && existingUserName.id !== Number(id)) {
      await transaction.rollback();
      return res
        .status(USER.ALREADY_EXISTS.CODE)
        .json({ msg: USER.ALREADY_EXISTS.MESSAGE });
    }

    // WakaTime side first: a conflict (e-mail / employee code) leaves the user unchanged
    const savedBy = req.user?.username;
    if (wakatime) {
      const dev = await saveDeveloperOf(
        { id: Number(id), firstName, lastName, username, email, phone },
        wakatime,
        savedBy,
      );
      if (dev.error) {
        await transaction.rollback();
        return res.status(dev.error.CODE).json({ msg: dev.error.MESSAGE });
      }
    }
    if (Array.isArray(teamIds)) await saveTeamsOf(Number(id), teamIds, savedBy);

    await db.E2M_User.update(
      {
        firstName,
        lastName,
        username,
        email,
        phone,
        location,
      },
      { where: { id, isActive: false }, transaction },
    );

    const userInstance = await db.E2M_User.findByPk(Number(id), {
      raw: false,
      transaction,
    });

    if (roleIds && roleIds.length > 0) {
      await userInstance.addRoles(roleIds, { transaction });
    }

    if (removedRoleIds && removedRoleIds.length > 0) {
      await userInstance.removeRoles(removedRoleIds, { transaction });
    }

    await transaction.commit();

    const updatedUser = await db.E2M_User.findAll({
      where: { id, isActive: false },
      include: [
        {
          model: db.E2M_Role,
          as: 'roles',
          attributes: ['id', 'role'],
          where: { isActive: false },
          required: false,
        },
      ],
      attributes: { exclude: ['password'] },
      raw: true,
    });

    const result = await withExtras(getUniqueUsers(updatedUser));

    return res
      .status(USER.UPDATE.CODE)
      .json({ msg: USER.UPDATE.MESSAGE, data: result });
  } catch (err) {
    if (!transaction.finished) await transaction.rollback();
    console.error('[updateUser] error:', err);
    logger.error('[updateUser] error:', err);
    return res
      .status(INTERNAL_SERVER_ERROR.CODE)
      .json({ msg: INTERNAL_SERVER_ERROR.MESSAGE });
  }
};

// ─── DELETE USER (SOFT) ───────────────────────────────────────────────────────
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const existingUser = await db.E2M_User.findOne({
      where: { id, isActive: false },
      raw: true,
    });

    if (!existingUser) {
      return res.status(404).json({ msg: 'User Not Found' });
    }

    await db.E2M_User.update(
      { isActive: true },
      { where: { id, isActive: false } },
    );

    // Stop collecting for the user's developer (activity kept) and leave every team
    await execProc('PRC_Remove_User_Links', {
      pIN_userId: [sql.Int, Number(id)],
      pIN_deletedBy: [sql.NVarChar(100), req.user?.username],
    });

    return res.status(USER.DELETE.CODE).json({ msg: USER.DELETE.MESSAGE });
  } catch (err) {
    console.error('[deleteUser] error:', err);
    logger.error('[deleteUser] error:', err);
    return res
      .status(INTERNAL_SERVER_ERROR.CODE)
      .json({ msg: INTERNAL_SERVER_ERROR.MESSAGE });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, phone } = req.body;

    const existingUser = await db.E2M_User.findOne({
      where: { id, isActive: false },
      raw: true,
    });

    if (!existingUser) {
      return res.status(404).json({ msg: 'User Not Found' });
    }

    await db.E2M_User.update(
      { firstName, lastName, email, phone },
      { where: { id, isActive: false } },
    );

    return res.status(USER.UPDATE.CODE).json({ msg: USER.UPDATE.MESSAGE });
  } catch (err) {
    console.error('[updateProfile] error:', err);
    logger.error('[updateProfile] error:', err);
    return res
      .status(INTERNAL_SERVER_ERROR.CODE)
      .json({ msg: INTERNAL_SERVER_ERROR.MESSAGE });
  }
};

module.exports = {
  getUsers,
  addUser,
  updateUser,
  deleteUser,
  updateProfile,
};
