'use strict';

module.exports = (sequelize, DataTypes) => {
  const UserRole = sequelize.define(
    'E2M_UserRoleMapping',
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },

      // Basic information
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      roleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: 'E2M_UserRoleMapping',
      timestamps: true,
    }
  );

  return UserRole;
};
