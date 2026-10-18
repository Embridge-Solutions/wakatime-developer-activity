"use strict";

const logger = require("../utils/logger");
const { INTERNAL_SERVER_ERROR } = require("../data/statusMessage");

/**
 * Request timeout middleware — wraps each request with a deadline.
 * If the handler doesn't respond within the limit, it sends a 503.
 */
const requestTimeout = (timeoutMs = 30000) => (req, res, next) => {
  const timer = setTimeout(() => {
    if (!res.headersSent) {
      const msg = `[Request Timeout] ${req.method} ${req.originalUrl} exceeded ${timeoutMs}ms`;
      console.error(msg);
      logger.error(msg);
      res.status(503).json({ msg: "Request timed out. Please try again." });
    }
  }, timeoutMs);

  res.on("finish", () => clearTimeout(timer));
  res.on("close", () => clearTimeout(timer));

  next();
};

/**
 * Express global error handler (4-arg signature required by Express).
 * Catches any error passed via next(err) from route handlers.
 * Logs to both console.error and the file logger.
 * Returns a generic 500 — no internal details exposed to the client.
 */
const globalErrorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  const label = err.label || "Unhandled Route Error";
  const location = `${req.method} ${req.originalUrl}`;

  console.error(`[${label}] ${location}`, err);
  logger.error(`[${label}] ${location}`, err);

  if (res.headersSent) return;

  res
    .status(err.status || INTERNAL_SERVER_ERROR.CODE)
    .json({ msg: INTERNAL_SERVER_ERROR.MESSAGE });
};

module.exports = { requestTimeout, globalErrorHandler };
