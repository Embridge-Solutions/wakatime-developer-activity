const { db } = require('../../../communications/models');
const { AUTH, COMMON, INTERNAL_SERVER_ERROR } = require('../../../data/statusMessage');
const { formatDateTime } = require('../../../utils');
const logger = require('../../../utils/logger');


const getScopes = async (req, res) => {
  try {
    const scopes = await db.E2M_Scopes.findAll({
      where: {
        isActive: false,
      },
      attributes: ['id', 'scope', 'description', 'createdAt', 'updatedAt'],
      raw: true,
    });

    const result = scopes?.map((scope) => {
      scope.createdAt = formatDateTime(scope.createdAt);
      scope.updatedAt = formatDateTime(scope.updatedAt);
      return scope;
    });

    if (!result) {
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
    console.error('[getScopes] error:', err);
    logger.error('[getScopes] error:', err);
    return res.status(INTERNAL_SERVER_ERROR.CODE).json({ msg: INTERNAL_SERVER_ERROR.MESSAGE });
  }
};

module.exports = { getScopes };
