const ENV = require('./env');
const { db } = require('../communications/models');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    await db.sequelize
      .authenticate()
      .then(() => {
        if (ENV.APP === 'IOTify_Development') {
          //use this sync if table is does not exist its automatically created
          // db.sequelize.sync({ alter: true });
        }
        const msg = `Successfully connected to the ${ENV.DB_NAME} database`;
        console.log(`✅ ${msg}`);
        logger.info(msg);
      })
      .catch((err) => {
        const msg = `Unable to connect to the ${ENV.DB_NAME} database`;
        console.error(`❌ ${msg}`, err);
        logger.error(msg, err);
      });
  } catch (error) {
    const msg = `Unable to connect to the ${ENV.DB_NAME} database`;
    console.error(`❌ ${msg}`, error);
    logger.error(msg, error);
  }
};

module.exports = { connectDB };
