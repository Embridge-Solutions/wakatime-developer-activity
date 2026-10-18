'use strict';

module.exports = (sequelize, DataTypes) => {
  const E2M_Role = sequelize.define(
    'E2M_Role',
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },

      role: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      // role status
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: 'E2M_Role',
      timestamps: true,
    }
  );

  E2M_Role.associate = (models) => {
    E2M_Role.belongsToMany(models.E2M_User, {
      through: 'E2M_UserRoleMapping',
      foreignKey: 'roleId',
      as: 'users',
    });

    E2M_Role.belongsToMany(models.E2M_Scopes, {
      through: 'E2M_RoleScopeMapping',
      foreignKey: 'roleId',
      as: 'scopes',
    });
  };

  return E2M_Role;
};
