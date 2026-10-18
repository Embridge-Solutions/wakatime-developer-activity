'use strict';

module.exports = (sequelize, DataTypes) => {
  const RoleScope = sequelize.define(
    'E2M_RoleScopeMapping',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      roleId: { type: DataTypes.INTEGER },
      scopeId: { type: DataTypes.INTEGER },
    },
    {
      tableName: 'E2M_RoleScopeMapping',
      timestamps: true,
    }
  );

  return RoleScope;
};
