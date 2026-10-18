const { db } = require('../../../communications/models');

const { AUTH, COMMON, ROLE, INTERNAL_SERVER_ERROR } = require('../../../data/statusMessage');
const { getUniqueRolesWithScopes } = require('../../../utils');
const logger = require('../../../utils/logger');

const getRoles = async (req, res) => {
  try {
    const roles = await db.E2M_Role.findAll({
      where: {
        isActive: false,
      },
      include: [
        {
          model: db.E2M_Scopes,
          as: 'scopes',
          attributes: ['id', 'scope'],
          where: {
            isActive: false,
          },
        },
      ],
      raw: true,
    });

    const result = getUniqueRolesWithScopes(roles);

    if (!roles) {
      return res
        .status(AUTH.INVALID_ROLE.CODE)
        .json({ msg: AUTH.INVALID_ROLE.MESSAGE });
    }

    return res.json({
      success: true,
      msg: COMMON.SUCCESS.MESSAGE,
      data: result,
    });
  } catch (err) {
    console.error('[getRoles] error:', err);
    logger.error('[getRoles] error:', err);
    return res.status(INTERNAL_SERVER_ERROR.CODE).json({ msg: INTERNAL_SERVER_ERROR.MESSAGE });
  }
};

const addRole = async (req, res) => {
  try {
    const { roleName, description, permissions } = req.body;


    const existingRole = await db.E2M_Role.findOne({
      where: {
        role: roleName,
        isActive: false,
      },
    });


    if (existingRole) {
      return res
        .status(ROLE.ALREADY_EXISTS.CODE)
        .json({ msg: ROLE.ALREADY_EXISTS.MESSAGE });
    }

    const transaction = await db.sequelize.transaction();

    const role = await db.E2M_Role.create({
      role: roleName,
      description: description,
      isActive: false,
    },
      { transaction }
    );

    await role.setScopes(permissions, { transaction });

    await transaction.commit();

    const createdRole = await db.E2M_Role.findAll({
      where: {
        id: role.id,
        isActive: false,
      },
      include: [
        {
          model: db.E2M_Scopes,
          as: 'scopes',
          attributes: ['id', 'scope'],
          where: {
            isActive: false,
          },
        },
      ],
      raw: true,
    });

    const result = getUniqueRolesWithScopes(createdRole);

    return res.status(ROLE?.CREATED.CODE).json({
      msg: ROLE?.CREATED.MESSAGE,
      data: result,
    });
  } catch (err) {
    console.error('[addRole] error:', err);
    logger.error('[addRole] error:', err);
    return res.status(INTERNAL_SERVER_ERROR.CODE).json({ msg: INTERNAL_SERVER_ERROR.MESSAGE });
  }
};

const updateRole = async (req, res) => {

  const transaction = await db.sequelize.transaction();

  try {
    const { id } = req.params;
    const { roleName, description, permissions, removedPermissions } = req.body;

    // ── 1. Check role exists (raw plain object — just for existence check) ────
    const existingRole = await db.E2M_Role.findOne({
      where: { id, isActive: false },
      raw: true,
      transaction,
    });

    if (!existingRole) {
      await transaction.rollback();
      return res.status(ROLE.NOT_FOUND.CODE).json({ msg: ROLE.NOT_FOUND.MESSAGE });
    }

    // ── 2. Guard against duplicate role name (skip self) ─────────────────────
    const duplicateName = await db.E2M_Role.findOne({
      where: { role: roleName, isActive: false },
      raw: true,
      transaction,
    });

    if (duplicateName && duplicateName.id !== Number(id)) {
      await transaction.rollback();
      return res
        .status(ROLE.NAME_ALREADY_EXISTS.CODE)
        .json({ msg: ROLE.NAME_ALREADY_EXISTS.MESSAGE });
    }

    // ── 3. Update role fields (static model method — works with raw config) ───
    await db.E2M_Role.update(
      { role: roleName, description },
      { where: { id, isActive: false }, transaction }
    );

    // ── 4. Sync permissions via a live model instance (raw: false required) ───
    const roleInstance = await db.E2M_Role.findByPk(Number(id), {
      raw: false,
      transaction,
    });

    if (permissions && permissions.length > 0) {
      await roleInstance.addScopes(permissions, { transaction });
    }

    if (removedPermissions && removedPermissions.length > 0) {
      await roleInstance.removeScopes(removedPermissions, { transaction });
    }

    await transaction.commit();

    // ── 5. Return the refreshed role with its current scopes ──────────────────
    const updatedRole = await db.E2M_Role.findAll({
      where: { id, isActive: false },
      include: [
        {
          model: db.E2M_Scopes,
          as: 'scopes',
          attributes: ['id', 'scope'],
          where: { isActive: false },
        },
      ],
      raw: true,
    });

    const result = getUniqueRolesWithScopes(updatedRole);

    return res.status(ROLE.UPDATE.CODE).json({
      msg: ROLE.UPDATE.MESSAGE,
      data: result,
    });
  } catch (err) {
    await transaction.rollback();
    console.error('[updateRole] error:', err);
    logger.error('[updateRole] error:', err);
    return res
      .status(INTERNAL_SERVER_ERROR.CODE)
      .json({ msg: INTERNAL_SERVER_ERROR.MESSAGE });
  }
};

const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    const existingRole = await db.E2M_Role.findOne({
      where: { id, isActive: false },
      raw: true,
    });

    if (!existingRole) {
      return res.status(ROLE.NOT_FOUND.CODE).json({ msg: ROLE.NOT_FOUND.MESSAGE });
    }

    await db.E2M_Role.update(
      { isActive: true },
      { where: { id, isActive: false } }
    );

    return res.status(ROLE.DELETE.CODE).json({ msg: ROLE.DELETE.MESSAGE });
  } catch (err) {
    console.error('[deleteRole] error:', err);
    logger.error('[deleteRole] error:', err);
    return res.status(INTERNAL_SERVER_ERROR.CODE).json({ msg: INTERNAL_SERVER_ERROR.MESSAGE });
  }
};

module.exports = { getRoles, addRole, updateRole, deleteRole };
