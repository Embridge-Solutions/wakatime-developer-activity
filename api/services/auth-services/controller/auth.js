const jwt = require('jsonwebtoken');
const { AUTH, INTERNAL_SERVER_ERROR } = require('../../../data/statusMessage');
const bcrypt = require('bcrypt');
const ENV = require('../../../config/env');
const { db } = require('../../../communications/models');
const { getCookieConfig } = require('../../../utils');
const logger = require('../../../utils/logger');

const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await db.E2M_User.findOne({
      where: {
        username: username,
        isActive: false,
      },
    });

    if (!user) {
      return res
        .status(AUTH.USER_NOT_FOUND.CODE)
        .json({ msg: AUTH.USER_NOT_FOUND.MESSAGE });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res
        .status(AUTH.PASSWORD_NOT_VALID.CODE)
        .json({ msg: AUTH.PASSWORD_NOT_VALID.MESSAGE });
    }

    const roles = await db.E2M_Role.findAll({
      where: {
        isActive: false,
      },
      include: [
        {
          model: db.E2M_User,
          as: 'users',
          where: { id: user.id },
        },
      ],
      raw: true,
    });

    if (!roles) {
      return res
        .status(AUTH.INVALID_ROLE.CODE)
        .json({ msg: AUTH.INVALID_ROLE.MESSAGE });
    }

    const roleIds = roles?.map((da) => da.id);
    const roleNames = roles?.map((da) => da.role);

    const scopes = await db.E2M_Scopes.findAll({
      where: {
        isActive: false,
      },
      include: [
        {
          model: db.E2M_Role,
          as: 'scopeToRole',
          where: { id: roleIds },
        },
      ],
      raw: true,
    });

    const allScopes = scopes?.map((item) => item?.scope);

    const payload = {
      id: user?.id,
      username: user?.username,
      firstName: user?.firstName,
      lastName: user?.lastName,
      email: user?.email,
      phone: user?.phone,
      location: user?.location,
      role: roleNames,
      scopes: allScopes,
    };

    const accessToken = jwt.sign(payload, ENV.ACCESS_TOKEN_SECRET, {
      expiresIn: ENV.ACCESS_TOKEN_LIFE,
    });

    const refreshToken = jwt.sign(payload, ENV.REFRESH_TOKEN_SECRET, {
      expiresIn: ENV.REFRESH_TOKEN_LIFE,
    });

    // Cookie configuration

    const cookieConfig = getCookieConfig(req.headers.host);

    res
      .cookie(ENV.COOKIE_ACCESS_TOKEN_KEY, accessToken, {
        ...cookieConfig,

        maxAge: ENV.COOKIE_ACCESS_TOKEN_AGE_LIMIT * 60 * 1000,
      })
      .cookie(ENV.COOKIE_REFRESH_TOKEN_KEY, refreshToken, {
        ...cookieConfig,

        maxAge: ENV.COOKIE_REFRESH_TOKEN_AGE_LIMIT * 60 * 1000,
      });

    return res.json({
      success: true,
      msg: AUTH.LOGIN.MESSAGE,
      accessToken: accessToken,
      refreshToken: refreshToken,
    });
  } catch (err) {
    console.error('[login] error:', err);
    logger.error('[login] error:', err);
    return res.status(500).json({ msg: 'Server error' });
  }
};

const logout = async (req, res) => {
  try {
    const cookieConfig = getCookieConfig(req.headers.host);

    res.clearCookie(ENV.COOKIE_ACCESS_TOKEN_KEY, {
      ...cookieConfig,
    });

    res.clearCookie(ENV.COOKIE_REFRESH_TOKEN_KEY, {
      ...cookieConfig,
    });

    res.json({ message: 'Logout success' });
  } catch (error) {
    console.error('[logout] error:', error);
    logger.error('[logout] error:', error);
    return res
      .status(INTERNAL_SERVER_ERROR.CODE)
      .json({ msg: INTERNAL_SERVER_ERROR.MESSAGE });
  }
};

const updatePassword = async (req, res) => {
  try {
    const { id, currentPassword, newPassword } = req.body;

    const existingUser = await db.E2M_User.findOne({
      where: { id, isActive: false },
      raw: true,
    });

    if (!existingUser) {
      return res.status(404).json({ msg: 'User Not Found' });
    }

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ msg: 'Both current password and new password are required.' });
    }

    const passwordMatch = await bcrypt.compare(
      currentPassword,
      existingUser.password,
    );

    if (!passwordMatch) {
      return res.status(400).json({ msg: 'Current password is incorrect.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.E2M_User.update(
      { password: hashedPassword },
      { where: { id, isActive: false } },
    );

    return res.status(200).json({ msg: 'Password updated successfully!' });
  } catch (err) {
    console.error('[updatePassword] error:', err);
    logger.error('[updatePassword] error:', err);
    return res
      .status(500)
      .json({ msg: 'Server error while updating password.' });
  }
};

/* ── Step 1: Verify user exists (forgot-password flow) ──────────────── */
const verifyUser = async (req, res) => {
  try {
    const { username } = req.body;

    if (!username || !username.trim()) {
      return res.status(400).json({ msg: 'Username is required.' });
    }

    const user = await db.E2M_User.findOne({
      where: { username: username.trim(), isActive: false },
      attributes: ['id', 'username', 'firstName', 'lastName'],
      raw: true,
    });

    if (!user) {
      return res
        .status(404)
        .json({ msg: 'No account found with that username.' });
    }

    return res.status(200).json({
      success: true,
      msg: 'User verified.',
      data: {
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (err) {
    console.error('[verifyUser] error:', err);
    logger.error('[verifyUser] error:', err);
    return res.status(500).json({ msg: 'Server error while verifying user.' });
  }
};

/* ── Step 2: Reset password without requiring current password ──────── */
const forgotPassword = async (req, res) => {
  try {
    const { username, newPassword } = req.body;

    if (!username || !newPassword) {
      return res
        .status(400)
        .json({ msg: 'Username and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ msg: 'Password must be at least 6 characters.' });
    }

    const user = await db.E2M_User.findOne({
      where: { username: username.trim(), isActive: false },
      raw: true,
    });

    if (!user) {
      return res.status(404).json({ msg: 'User not found.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.E2M_User.update(
      { password: hashedPassword },
      { where: { username: username.trim(), isActive: false } },
    );

    return res
      .status(200)
      .json({ success: true, msg: 'Password reset successfully!' });
  } catch (err) {
    console.error('[forgotPassword] error:', err);
    logger.error('[forgotPassword] error:', err);
    return res
      .status(500)
      .json({ msg: 'Server error while resetting password.' });
  }
};

const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res
      .status(AUTH.INVALID_REFRESH_TOKEN.CODE)
      .json({ msg: AUTH.INVALID_REFRESH_TOKEN.MESSAGE });
  }

  try {
    const userAccess = jwt.verify(refreshToken, ENV.REFRESH_TOKEN_SECRET);

    if (!userAccess) {
      return res
        .status(AUTH.INVALID_REFRESH_TOKEN.CODE)
        .json({ msg: AUTH.INVALID_REFRESH_TOKEN.MESSAGE });
    }

    const { iat, exp, ...payload } = userAccess;

    const accessToken = jwt.sign(payload, ENV.ACCESS_TOKEN_SECRET, {
      expiresIn: ENV.ACCESS_TOKEN_LIFE,
    });

    const newRefreshToken = jwt.sign(payload, ENV.REFRESH_TOKEN_SECRET, {
      expiresIn: ENV.REFRESH_TOKEN_LIFE,
    });

    const cookieConfig = getCookieConfig(req.headers.host);

    res
      .cookie(ENV.COOKIE_ACCESS_TOKEN_KEY, accessToken, {
        ...cookieConfig,
        maxAge: ENV.COOKIE_ACCESS_TOKEN_AGE_LIMIT * 60 * 1000,
      })
      .cookie(ENV.COOKIE_REFRESH_TOKEN_KEY, newRefreshToken, {
        ...cookieConfig,
        maxAge: ENV.COOKIE_REFRESH_TOKEN_AGE_LIMIT * 60 * 1000,
      });

    return res.json({
      success: true,
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    console.error('[refreshToken] error:', err);
    logger.error('[refreshToken] error:', err);
    return res
      .status(AUTH.INVALID_REFRESH_TOKEN.CODE)
      .json({ msg: AUTH.INVALID_REFRESH_TOKEN.MESSAGE });
  }
};

module.exports = {
  login,
  logout,
  updatePassword,
  verifyUser,
  forgotPassword,
  refreshToken,
};
