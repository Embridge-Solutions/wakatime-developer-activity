const express = require('express');
const app = express();
const ENV = require('./config/env');
const { connectDB } = require('./config/db');
const cors = require('cors');
const { createServer } = require('http');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const serviceFiles = require('./global-config/config');
const path = require('path');
const PORT = ENV.PORT;
const logger = require('./utils/logger');

const {
  requestTimeout,
  globalErrorHandler,
} = require('./middleware/errorHandler');

const server = createServer(app);

// UI address + any extra origins from CORS_ORIGINS in .env
const allowedOrigins = [
  `http://${ENV.RUNNING_ORIGIN}:${ENV.RUNNING_PORT}`,
  ...ENV.CORS_ORIGINS,
];

// connect to database
connectDB();

//middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Attach a 30-second timeout to every request
app.use(requestTimeout(30000));

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }),
);

//used for development and production logging
app.use(morgan('dev'));

app.get('/ping', (req, res) => {
  res.send({ message: 'Developer Activity Server is Running' });
});

// ── Deep health check — verifies Express + Database connectivity ──────
app.get('/health', async (req, res) => {
  try {
    const { db } = require('./communications/models');
    await db.sequelize.authenticate();
    return res.json({
      status: 'healthy',
      server: 'healthy',
      database: 'healthy',
    });
  } catch (dbErr) {
    logger.error('HealthCheck', dbErr);
    return res.status(500).json({
      status: 'unhealthy',
      server: 'healthy',
      database: 'unhealthy',
      message: dbErr.message,
    });
  }
});

//routes
serviceFiles?.forEach((service) => {
  app.use(service.path, require(`./services/${service.fileName}/router`));
});

// Global error handler — must be registered AFTER all routes
app.use(globalErrorHandler);

server.listen(PORT, () => {
  const msg = `Server started successfully on port ${PORT}`;
  console.log(`✅ ${msg}`);
  logger.info(msg);

  // Nightly WakaTime developer activity collection (WAKA_SYNC_CRON in .env, default 9 PM)
  require('./services/wakatime-services/helpers/scheduler').startWakaSyncScheduler();
});

// Graceful shutdown handling to release the port quickly
const gracefulShutdown = (signal) => {
  console.log(`\n📶 ${signal} received. Closing HTTP server...`);
  logger.info(`📶 ${signal} received. Closing HTTP server...`);
  server.close(() => {
    console.log('🚪 HTTP server closed successfully.');
    logger.info('HTTP server closed successfully.');
    process.exit(0);
  });

  // Force close after 2 seconds if still hanging
  setTimeout(() => {
    console.error('❌ Forcefully shutting down because cleanup took too long.');
    logger.error('Forcefully shutting down because cleanup took too long.');
    process.exit(1);
  }, 2000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
