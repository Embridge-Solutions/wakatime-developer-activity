'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('E2M_Role', [
      {
        role: 'E2M_Developer',
        description: 'Has all permissions with Development Portal',
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        role: 'Super_Admin',
        description: 'Has all permissions',
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        role: 'Admin',
        description: 'System administrator',
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        role: 'Operator',
        description: 'machine operator and Supervisor',
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('E2M_Role', null, {
      truncate: true,
      cascade: true,
    });
  },
};
