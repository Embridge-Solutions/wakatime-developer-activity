const jwt = require('jsonwebtoken');
const { AUTH } = require('../../data/statusMessage');
const { db } = require('../models');
const { getCookieConfig } = require('../../utils');

const auth = async (req, res, next) => {
  // Fallback to headers if cookies are not present
  const accessToken =
    req.cookies.accessToken_cookie ||
    (req.headers['authorization']
      ? req.headers['authorization'].split(' ')[1]
      : undefined);
  const refreshToken =
    req.cookies.refreshToken_cookie || req.headers['refresh_token'];

  //verify the access token
  try {
    let userAccess;

    try {
      if (!accessToken) {
        if (!refreshToken) {
          return res
            .status(AUTH.INVALID_REFRESH_TOKEN.CODE)
            .json({ message: AUTH.INVALID_REFRESH_TOKEN.MESSAGE });
        }

        userAccess = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

        if (!userAccess) {
          return res
            .status(AUTH.INVALID_REFRESH_TOKEN.CODE)
            .json({ message: AUTH.INVALID_REFRESH_TOKEN.MESSAGE });
        }

        const { iat, exp, ...newPayload } = userAccess;

        const newAccessToken = jwt.sign(
          newPayload,
          process.env.ACCESS_TOKEN_SECRET,
          {
            expiresIn: process.env.ACCESS_TOKEN_LIFE,
          },
        );

        const cookieConfig = getCookieConfig(req.headers.host);

        res.cookie(process.env.COOKIE_ACCESS_TOKEN_KEY, newAccessToken, {
          ...cookieConfig,
          maxAge: process.env.COOKIE_ACCESS_TOKEN_AGE_LIMIT * 60 * 1000,
        });

        // Transmit refreshed token via header for non-cookie clients
        res.setHeader('x-access-token', newAccessToken);
      } else {
        userAccess = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
      }
    } catch (error) {
      console.log('error', error);
      if (error.name === 'TokenExpiredError') {
        if (!refreshToken) {
          return res
            .status(AUTH.INVALID_REFRESH_TOKEN.CODE)
            .json({ message: AUTH.INVALID_REFRESH_TOKEN.MESSAGE });
        }

        userAccess = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

        if (!userAccess) {
          return res
            .status(AUTH.INVALID_REFRESH_TOKEN.CODE)
            .json({ message: AUTH.INVALID_REFRESH_TOKEN.MESSAGE });
        }

        const { iat, exp, ...newPayload } = userAccess;

        const newAccessToken = jwt.sign(
          newPayload,
          process.env.ACCESS_TOKEN_SECRET,
          {
            expiresIn: process.env.ACCESS_TOKEN_LIFE,
          },
        );

        const cookieConfig = getCookieConfig(req.headers.host);

        res.cookie(process.env.COOKIE_ACCESS_TOKEN_KEY, newAccessToken, {
          ...cookieConfig,
          maxAge: process.env.COOKIE_ACCESS_TOKEN_AGE_LIMIT * 60 * 1000,
        });

        // Transmit refreshed token via header for non-cookie clients
        res.setHeader('x-access-token', newAccessToken);
      } else {
        return res
          .status(AUTH.INVALID_ACCESS_TOKEN.CODE)
          .json({ message: AUTH.INVALID_ACCESS_TOKEN.MESSAGE });
      }
    }

    if (userAccess) {
      //find the user
      const user = await db.E2M_User.findOne({
        where: { username: userAccess?.username, isActive: false },
      });

      if (!user) {
        return res
          .status(AUTH.USER_NOT_FOUND.CODE)
          .json({ message: AUTH.USER_NOT_FOUND.MESSAGE });
      }

      const userSession = await db.E2M_UserSession.findOne({
        where: { userId: user.id },
      });

      if (!userSession) {
        return res
          .status(AUTH.USER_SESSION_NOT_FOUND.CODE)
          .json({ message: AUTH.USER_SESSION_NOT_FOUND.MESSAGE });
      }

      const now = Date.now();

      // Convert configured INACTIVE_LIMIT minutes to milliseconds
      let inActiveLimit = process.env.INACTIVE_LIMIT * 60 * 1000;

      if (!userSession?.activityLogoutDisabled) {
        if (
          now - new Date(userSession.lastActivity).getTime() >
          inActiveLimit
        ) {
          return res
            .status(AUTH.USER_INACTIVE.CODE)
            .json({ message: AUTH.USER_INACTIVE.MESSAGE });
        }
      }

      await db.E2M_UserSession.update(
        { lastActivity: new Date() },
        { where: { id: userSession.id } },
      );

      // Successfully authenticated and session refreshed
      req.user = user;
      req.token = userAccess;
      next();
    }
  } catch (err) {
    console.log('auth error', err);
    return res
      .status(500)
      .json({ message: 'Invalid or expired token. Please log in again.' });
  }
};

module.exports = {
  auth,
};
