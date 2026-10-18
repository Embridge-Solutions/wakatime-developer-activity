'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('E2M_UserSession', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },

      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'E2M_User', // MUST MATCH USER TABLE NAME
          key: 'id',
        },
        onDelete: 'CASCADE', // if user deleted → session deleted too
        onUpdate: 'CASCADE',
      },

      lastActivity: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      activityLogoutDisabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true, // feature disabled by default
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false, // feature disabled by default
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },

      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('E2M_UserSession', ['userId']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('E2M_UserSession');
  },
};
