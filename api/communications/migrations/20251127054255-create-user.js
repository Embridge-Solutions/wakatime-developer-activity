'use strict';

/** @type {import('sequelize-cli').Migration} */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('E2M_User', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      username: {
        type: Sequelize.STRING(120),
        allowNull: false,
        unique: true,
      },

      // Basic information
      firstName: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      lastName: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING(120),
        allowNull: true,
        unique: false,
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: true,
        unique: false,
      },
      gender: {
        type: Sequelize.STRING(10),
        allowNull: true,
      },

      // Authentication
      password: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },

      // User status
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      emailVerified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      phoneVerified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      lastLoginAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      loginAttempts: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      location: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },

      // Auditing
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    // Add indexes for faster queries
    await queryInterface.addIndex('E2M_User', ['email']);
    await queryInterface.addIndex('E2M_User', ['phone']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('E2M_User');
  },
};
