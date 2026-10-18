const logger = require('./logger');
const { INTERNAL_SERVER_ERROR } = require('../data/statusMessage');

/** "1, 3,3" | [1,3] → ['1','3'] (unique, no blanks). */
const toIdList = (value) => {
  const list = Array.isArray(value) ? value : String(value ?? '').split(',');
  return [...new Set(list.map((v) => String(v).trim()).filter(Boolean))];
};

const getUniqueUsers = (users) => {
  let userData = {};

  users?.map((da) => {
    const userId = da.id;
    if (!userData[userId]) {
      userData[userId] = {
        id: da?.id,
        username: da.username,
        firstName: da?.firstName,
        lastName: da?.lastName,
        email: da?.email,
        phone: da?.phone,
        emailVerified: da?.emailVerified,
        phoneVerified: da?.phoneVerified,
        lastLoginAt: formatDateTime(da?.lastLoginAt),
        loginAttempts: da?.loginAttempts,
        location: da?.location,
        createdAt: formatDateTime(da?.createdAt),
        updatedAt: formatDateTime(da?.updatedAt),
        roles: [],
      };
    }

    userData[userId]?.roles.push(da?.roles?.role);
  });

  const userList = Object.values(userData);
  return userList;
};

const getUniqueUsersWithScopes = (users) => {
  const userData = {};

  users?.forEach((da) => {
    const userId = da.id;
    const roleId = da?.roles?.id;
    const scopeId = da?.roles?.scopes?.id;

    // 1️⃣ Create user if not exists
    if (!userData[userId]) {
      userData[userId] = {
        id: da?.id,
        username: da?.username,
        firstName: da?.firstName,
        lastName: da?.lastName,
        email: da?.email,
        phone: da?.phone,
        emailVerified: da?.emailVerified,
        phoneVerified: da?.phoneVerified,
        lastLoginAt: formatDateTime(da?.lastLoginAt),
        loginAttempts: da?.loginAttempts,
        location: da?.location,
        createdAt: formatDateTime(da?.createdAt),
        updatedAt: formatDateTime(da?.updatedAt),
        roles: [],
      };
    }

    const user = userData[userId];

    // 2️⃣ Check if role already added
    let existingRole = user.roles.find((r) => r.id === roleId);

    if (!existingRole && roleId) {
      existingRole = {
        id: roleId,
        role: da?.roles?.role,
        scopes: [],
      };

      user.roles.push(existingRole);
    }

    // 3️⃣ Add scope if not exists
    if (scopeId && existingRole) {
      const scopeExists = existingRole.scopes.find((s) => s.id === scopeId);

      if (!scopeExists) {
        existingRole.scopes.push({
          id: scopeId,
          scope: da?.roles?.scopes?.scope,
        });
      }
    }
  });

  return Object.values(userData);
};

const getUniqueRoles = (roles) => {
  let roleData = {};

  roles?.map((da) => {
    const roleId = da.id;
    if (!roleData[roleId]) {
      roleData[roleId] = {
        id: da?.id,
        role: da.role,
        description: da?.description,
        createdAt: formatDateTime(da?.createdAt),
        updatedAt: formatDateTime(da?.updatedAt),
        scopes: [],
      };
    }

    roleData[roleId]?.scopes.push(da?.scopes?.scope);
  });

  const roleList = Object.values(roleData);
  return roleList;
};

const getUniqueRolesWithScopes = (roles) => {
  let roleData = {};

  roles?.map((da) => {
    const roleId = da.id;
    if (!roleData[roleId]) {
      roleData[roleId] = {
        id: da?.id,
        role: da.role,
        description: da?.description,
        createdAt: formatDateTime(da?.createdAt),
        updatedAt: formatDateTime(da?.updatedAt),
        scopes: [],
      };
    }

    roleData[roleId]?.scopes.push({
      value: da?.scopes?.id,
      label: da?.scopes?.scope,
    });
  });

  const roleList = Object.values(roleData);
  return roleList;
};

const formatDateTime = (dateValue) => {
  if (!dateValue) return '';

  const date = new Date(dateValue);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

// export const getCookieConfig = () => {
//   const isProd = process.env.NODE_ENV === 'production';
//   return {
//     httpOnly: true,
//     // Must be false over local HTTP (192.168.x.x) for browsers to accept it
//     secure: isProd ? true : false,
//     // If secure is false (HTTP), SameSite MUST be 'lax' or 'strict', it cannot be 'none'
//     sameSite: isProd ? 'lax' : 'lax',
//     path: '/',
//     // domain is only need for tunnel.
//     //  domain: '.devtunnels.ms',
//   };
// };

const getCookieConfig = (host) => {
  return {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
  };
};

const fail = (res, name, err) => {
  console.error(`[${name}] error:`, err);
  logger.error(`[${name}] error:`, err);
  return res
    .status(INTERNAL_SERVER_ERROR.CODE)
    .json({ success: false, msg: INTERNAL_SERVER_ERROR.MESSAGE });
};

module.exports = {
  getUniqueUsers,
  getUniqueUsersWithScopes,
  toIdList,
  getUniqueRoles,
  getUniqueRolesWithScopes,
  formatDateTime,
  fail,
  getCookieConfig,
};
