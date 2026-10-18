'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);
const ENV = require('../../config/env');
const db = {};
const sql = require('mssql');

const sequelize = new Sequelize(ENV.DB_NAME, ENV.DB_USERNAME, ENV.DB_PASSWORD, {
  host: ENV.DB_HOST,
  port: ENV.DB_PORT,
  dialect: ENV.DB_DIALECT,
  query: {
    raw: true,
    nest: true,
  },
  pool: {
    max: 10, // maximum allowed connections
    min: 0, // minimum connections
    // acquire: 30000, // max time (ms) try to get connection before error
    idle: 10000, // time (ms) connection stays idle before released
  },
  dialectOptions: {
    options: {
      encrypt: ENV.ENCRYPT === 'true', // set true if Azure SQL
      trustServerCertificate: ENV.TRUST_SERVER_CERTIFICATE === 'true',
      requestTimeout: 60000,
      // encrypt: true, // set true if Azure SQL
      // trustServerCertificate: true,
      // requestTimeout: 60000,
    },
  },
  logging: false,
  retry: {
    max: 3,
  },
});

const config = {
  user: ENV.DB_USERNAME,
  password: ENV.DB_PASSWORD,
  server: ENV.DB_HOST,
  port: ENV.DB_PORT,
  database: ENV.DB_NAME,
  options: {
    encrypt: ENV.ENCRYPT === 'true',
    trustServerCertificate: ENV.TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
  },
  requestTimeout: 120000, // a developer-day of heartbeats is saved in one call
};

const poolPromise = new sql.ConnectionPool(config).connect().then((pool) => {
  return pool;
});

fs.readdirSync(__dirname)
  .filter((file) => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file !== 'baseModel.js' &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(
      sequelize,
      Sequelize.DataTypes,
    );
    db[model.name] = model;
  });

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = { poolPromise, db };
