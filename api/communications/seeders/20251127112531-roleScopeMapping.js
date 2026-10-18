'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      'E2M_RoleScopeMapping',
      [
        { roleId: 1, scopeId: 1, createdAt: new Date(), updatedAt: new Date() },
        { roleId: 1, scopeId: 2, createdAt: new Date(), updatedAt: new Date() },
        { roleId: 1, scopeId: 3, createdAt: new Date(), updatedAt: new Date() },
        { roleId: 1, scopeId: 4, createdAt: new Date(), updatedAt: new Date() },
        { roleId: 2, scopeId: 1, createdAt: new Date(), updatedAt: new Date() },
        { roleId: 2, scopeId: 2, createdAt: new Date(), updatedAt: new Date() },
        { roleId: 2, scopeId: 3, createdAt: new Date(), updatedAt: new Date() },
        { roleId: 2, scopeId: 4, createdAt: new Date(), updatedAt: new Date() },
      ],
      {}
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('E2M_RoleScopeMapping', null, {
      truncate: true,
      cascade: true,
    });
  },
};
