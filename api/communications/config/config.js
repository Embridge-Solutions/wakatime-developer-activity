require('dotenv').config({
  path: require('path').resolve(__dirname, '../../.env'),
});

module.exports = {
  development: {
    username: process.env.DB_USERNAME || 'sa',
    password: process.env.DB_PASSWORD || null,
    database: process.env.DB_NAME || 'database_development',
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 1433,
    dialect: process.env.DB_DIALECT || 'mssql',
  },
  test: {
    username: process.env.DB_USERNAME || 'sa',
    password: process.env.DB_PASSWORD || null,
    database: process.env.DB_NAME || 'database_test',
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 1433,
    dialect: process.env.DB_DIALECT || 'mssql',
  },
  production: {
    username: process.env.DB_USERNAME || 'sa',
    password: process.env.DB_PASSWORD || null,
    database: process.env.DB_NAME || 'database_production',
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 1433,
    dialect: process.env.DB_DIALECT || 'mssql',
  },
};
