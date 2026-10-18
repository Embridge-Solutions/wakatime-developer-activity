'use strict';
const bcrypt = require('bcrypt');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const developmentPwd = await bcrypt.hash('E2MDev@123!', 10);
    const superAdminPwd = await bcrypt.hash('SuperAdmin@123', 10);
    const adminPwd = await bcrypt.hash('Admin@123', 10);

    await queryInterface.bulkInsert(
      'E2M_User',
      [
        {
          username: 'jaiDeveloper',
          firstName: 'Jayaseelan',
          lastName: 'P',
          email: 'jayaseelan.p@embridgesolutions.in',
          phone: null,
          gender: 'male',
          password: developmentPwd,
          isActive: false,
          emailVerified: true,
          phoneVerified: true,
          lastLoginAt: null,
          loginAttempts: 0,
          location: 'Chennai',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          username: 'superAdmin',
          firstName: 'SuperAdmin',
          lastName: 'A',
          email: 'jai001@gmail.com',
          phone: '1234567890',
          gender: 'male',
          password: superAdminPwd,
          isActive: false,
          emailVerified: true,
          phoneVerified: true,
          lastLoginAt: null,
          loginAttempts: 0,
          location: 'Chennai',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          username: 'admin',
          firstName: 'Admin',
          lastName: 'A',
          email: 'jai@gmail.com',
          phone: '8270849900',
          gender: 'male',
          password: adminPwd,
          isActive: false,
          emailVerified: true,
          phoneVerified: true,
          lastLoginAt: null,
          loginAttempts: 0,
          location: 'Chennai',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {}
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('E2M_User', null, {
      truncate: true,
      cascade: true,
    });
  },
};
