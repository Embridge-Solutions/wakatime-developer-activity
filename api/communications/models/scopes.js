'use strict';

module.exports = (sequelize, DataTypes) => {
  const Scopes = sequelize.define(
    'E2M_Scopes',
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      scope: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      tableName: 'E2M_Scopes',
      timestamps: true,
    }
  );

  Scopes.associate = (models) => {
    Scopes.belongsToMany(models.E2M_Role, {
      through: 'E2M_RoleScopeMapping',
      foreignKey: 'scopeId',
      as: 'scopeToRole',
    });
  };

  return Scopes;
};
