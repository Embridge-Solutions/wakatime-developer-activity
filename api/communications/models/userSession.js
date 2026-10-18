module.exports = (sequelize, DataTypes) => {
  const UserSession = sequelize.define(
    'E2M_UserSession',
    {
      userId: { type: DataTypes.INTEGER, allowNull: false },
      lastActivity: { type: DataTypes.DATE, allowNull: true },
      activityLogoutDisabled: { type: DataTypes.BOOLEAN, defaultValue: true },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },

    {
      tableName: 'E2M_UserSession',
      timestamps: true,
    }
  );

  UserSession.associate = (models) => {
    UserSession.belongsTo(models.E2M_User, {
      foreignKey: 'userId',
    });
  };

  return UserSession;
};
