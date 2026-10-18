'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      'E2M_UserSession',
      [
        {
          userId: 1,
          lastActivity: null,
          activityLogoutDisabled: true,
          isActive: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          userId: 2,
          lastActivity: null,
          activityLogoutDisabled: true,
          isActive: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          userId: 3,
          lastActivity: null,
          activityLogoutDisabled: true,
          isActive: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {}
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('E2M_UserSession', null, {
      truncate: true,
      cascade: true,
    });
  },
};
