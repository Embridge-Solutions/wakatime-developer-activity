'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('E2M_Scopes', [
      {
        scope: 'user_view',
        description: 'View the User list',
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        scope: 'user_create',
        description: 'Create new users',
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        scope: 'user_update',
        description: 'Update the User Details',
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        scope: 'user_delete',
        description: 'Delete the user',
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('E2M_Scopes', null, {
      truncate: true,
      cascade: true,
    });
  },
};
