// SMTP transport — configured ONLY from .env (SMTP_*). The password never leaves the server:
// status() masks the user and reports whether a password is set, nothing more.
const nodemailer = require('nodemailer');
const ENV = require('../../../config/env');
const logger = require('../../../utils/logger');

let transporter = null;

const isSmtpConfigured = () => Boolean(ENV.SMTP_HOST && ENV.MAIL_FROM_ADDRESS);

/** "ravi.kumar@company.com" → "ra••••••@company.com" */
const mask = (value) => {
  if (!value) return '';
  const [name, domain] = String(value).split('@');
  const shown = name.slice(0, 2);
  return `${shown}${'•'.repeat(Math.max(3, name.length - 2))}${domain ? `@${domain}` : ''}`;
};

/** What the settings screen may see: a few non-secret fields. Never the password or how it is stored. */
const smtpStatus = () => ({
  configured: isSmtpConfigured(),
  server: ENV.SMTP_HOST ? `${ENV.SMTP_HOST}:${ENV.SMTP_PORT}` : '',
  security: ENV.SMTP_SECURE ? 'SSL / TLS' : 'STARTTLS',
  user: mask(ENV.SMTP_USER),
  sender: ENV.MAIL_FROM_ADDRESS ? `${ENV.MAIL_FROM_NAME} <${ENV.MAIL_FROM_ADDRESS}>` : '',
});

const getTransporter = () => {
  if (!isSmtpConfigured()) throw new Error('Mail server is not configured');
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: ENV.SMTP_HOST,
      port: ENV.SMTP_PORT,
      secure: ENV.SMTP_SECURE,
      auth: ENV.SMTP_USER ? { user: ENV.SMTP_USER, pass: ENV.SMTP_PASSWORD } : undefined,
      requireTLS: !ENV.SMTP_SECURE && ENV.SMTP_PORT === 587,
      tls: { rejectUnauthorized: ENV.SMTP_TLS_REJECT_UNAUTHORIZED, minVersion: 'TLSv1.2' },
      connectionTimeout: 20000,
      pool: true,
      maxConnections: 3,
    });
  }
  return transporter;
};

/** Connects and logs in to the SMTP server without sending anything. */
const verifySmtp = async () => {
  try {
    await getTransporter().verify();
    return { ok: true };
  } catch (err) {
    // Never echo credentials — nodemailer errors don't contain the password
    return { ok: false, error: err.message };
  }
};

const sendMail = async ({ to, cc, subject, html, text }) => {
  const info = await getTransporter().sendMail({
    from: { name: ENV.MAIL_FROM_NAME, address: ENV.MAIL_FROM_ADDRESS },
    to,
    cc: cc && cc.length ? cc : undefined,
    subject,
    html,
    text,
  });
  logger.info(`[mail] sent "${subject}" to ${Array.isArray(to) ? to.join(', ') : to}`);
  return info;
};

/** "a@x.com; b@y.com, bad" → ['a@x.com', 'b@y.com'] */
const parseEmails = (value) =>
  [...new Set(String(value ?? '').split(/[;,\s]+/).map((e) => e.trim().toLowerCase()))].filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

module.exports = { isSmtpConfigured, smtpStatus, verifySmtp, sendMail, parseEmails };
