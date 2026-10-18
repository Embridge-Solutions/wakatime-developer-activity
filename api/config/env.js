require('dotenv').config({
  debug: false,
});

//process the dotenv variables
let ENV = {};

const numOr = (value, fallback) =>
  value === undefined || value === '' || Number.isNaN(Number(value)) ? fallback : Number(value);

// APP CONFIGURATION
ENV.APP = process.env.APP || 'Developer_Activity_Development';
ENV.PORT = process.env.PORT || 6689;
ENV.NODE_ENV = process.env.NODE_ENV || 'development';
ENV.ENCRYPT = process.env.ENCRYPT || 'false';
ENV.TRUST_SERVER_CERTIFICATE = process.env.TRUST_SERVER_CERTIFICATE || 'true';

// ORIGINS — the UI address allowed by CORS; extra origins comma separated in CORS_ORIGINS
ENV.RUNNING_ORIGIN = process.env.RUNNING_ORIGIN || 'localhost';
ENV.RUNNING_PORT = process.env.RUNNING_PORT || '3000';
ENV.CORS_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// DB CONFIGURATION
ENV.DB_DIALECT = process.env.DB_DIALECT || 'mssql';
ENV.DB_HOST = process.env.DB_HOST || 'localhost';
ENV.DB_PORT = numOr(process.env.DB_PORT, 1433);
ENV.DB_NAME = process.env.DB_NAME || 'E2M_Developer_Activity';
ENV.DB_USERNAME = process.env.DB_USERNAME || 'sa';
ENV.DB_PASSWORD = process.env.DB_PASSWORD || '';

// TOKEN SECRETS
ENV.ACCESS_TOKEN_SECRET =
  process.env.ACCESS_TOKEN_SECRET || 'your_access_token_secret';
ENV.ACCESS_TOKEN_LIFE = process.env.ACCESS_TOKEN_LIFE || '15m';
ENV.REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET || 'your_refresh_token_secret';
ENV.REFRESH_TOKEN_LIFE = process.env.REFRESH_TOKEN_LIFE || '7d';

ENV.RESET_PASSWORD_TOKEN_SECRET =
  process.env.RESET_PASSWORD_TOKEN_SECRET || 'your_reset_password_token_secret';
ENV.RESET_PASSWORD_TOKEN_LIFE = process.env.RESET_PASSWORD_TOKEN_LIFE || '1h';

//Inactive Limits
ENV.INACTIVE_LIMIT = process.env.INACTIVE_LIMIT;

//cookies
ENV.COOKIE_ACCESS_TOKEN_KEY =
  process.env.COOKIE_ACCESS_TOKEN_KEY || 'accessToken_cookie';
ENV.COOKIE_ACCESS_TOKEN_AGE_LIMIT =
  process.env.COOKIE_ACCESS_TOKEN_AGE_LIMIT || 15; // 15 minutes

ENV.COOKIE_REFRESH_TOKEN_KEY =
  process.env.COOKIE_REFRESH_TOKEN_KEY || 'refreshToken_cookie';
ENV.COOKIE_REFRESH_TOKEN_AGE_LIMIT =
  process.env.COOKIE_REFRESH_TOKEN_AGE_LIMIT || 10080; // 7 days in minutes

// WAKATIME — developer activity collection
// WAKA_TOKEN_SECRET encrypts developers' API keys (min 16 chars). Never change it once keys are saved.
ENV.WAKA_TOKEN_SECRET = process.env.WAKA_TOKEN_SECRET || process.env.TOKEN_SECRET || '';
ENV.WAKA_TIMEZONE = process.env.WAKA_TIMEZONE || 'Asia/Kolkata';
// Same zone in Windows naming, used by SQL Server (AT TIME ZONE) for times on the dashboards
ENV.SQL_TIME_ZONE = process.env.SQL_TIME_ZONE || 'India Standard Time';
ENV.WAKA_SYNC_CRON = process.env.WAKA_SYNC_CRON || '0 21 * * *'; // 9 PM daily
// Set to false on extra API instances so each day is collected only once
ENV.WAKA_SYNC_ENABLED = process.env.WAKA_SYNC_ENABLED !== 'false';
ENV.WAKA_LOOKBACK_DAYS = numOr(process.env.WAKA_LOOKBACK_DAYS, 1); // also re-collect this many previous days
ENV.WAKA_API_MIN_INTERVAL_MS = numOr(process.env.WAKA_API_MIN_INTERVAL_MS, 300);
ENV.WAKA_FETCH_PROJECT_DETAILS = process.env.WAKA_FETCH_PROJECT_DETAILS !== 'false'; // branch + file breakdown
// Commit messages of the projects worked on (only for repositories connected in WakaTime)
ENV.WAKA_FETCH_COMMITS = process.env.WAKA_FETCH_COMMITS !== 'false';
// "Working now": last activity per project, refreshed every 10 minutes ("" = off)
ENV.WAKA_LIVE_CRON = process.env.WAKA_LIVE_CRON === undefined ? '*/10 * * * *' : process.env.WAKA_LIVE_CRON;
// A developer counts as working now when WakaTime saw activity within this many minutes
ENV.WAKA_ACTIVE_MINUTES = numOr(process.env.WAKA_ACTIVE_MINUTES, 15);
ENV.WAKA_DURATION_SLICES = (process.env.WAKA_DURATION_SLICES || 'project')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

module.exports = ENV;
