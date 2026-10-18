'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'E2M_User',
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      username: {
        type: DataTypes.STRING(120),
        allowNull: false,
        unique: true,
      },

      // Basic information
      firstName: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      lastName: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(120),
        allowNull: true,
        unique: false,
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
        unique: false,
      },
      gender: {
        type: DataTypes.STRING(10),
        allowNull: true,
      },

      // Authentication
      password: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },

      // User status
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      emailVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      phoneVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      lastLoginAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      loginAttempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      location: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
    },
    {
      tableName: 'E2M_User',
      timestamps: true,
    }
  );

  User.associate = (models) => {
    User.belongsToMany(models.E2M_Role, {
      through: 'E2M_UserRoleMapping',
      foreignKey: 'userId',
      as: 'roles',
      onDelete: 'CASCADE',
    });
  };

  return User;
};
