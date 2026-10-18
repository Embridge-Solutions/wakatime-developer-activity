// Thin WakaTime API client with throttling + retry.
// Auth: reading data needs the developer's personal OAuth token (waka_tok_…, from
// https://wakatime.com/oauth), sent as Bearer. WakaTime documents the secret API key
// (waka_…) as write-only — it is still tried as HTTP Basic, but expect a 401/403.
const ENV = require('../../../config/env');

const BASE = 'https://api.wakatime.com/api/v1';
const RETRYABLE = new Set([302, 429, 500, 502, 503, 504]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Shared across all developers so the whole run stays under the rate limit (< 10 req/s).
let lastCallAt = 0;
const throttle = async () => {
  const wait = lastCallAt + ENV.WAKA_API_MIN_INTERVAL_MS - Date.now();
  lastCallAt = Math.max(Date.now(), lastCallAt + ENV.WAKA_API_MIN_INTERVAL_MS);
  if (wait > 0) await sleep(wait);
};

class WakaApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.isAuthError = status === 401 || status === 403;
  }
}

const isOAuthToken = (key) => String(key).trim().startsWith('waka_tok_');

const authHeader = (apiKey) =>
  isOAuthToken(apiKey)
    ? `Bearer ${apiKey}`
    : `Basic ${Buffer.from(apiKey).toString('base64')}`;

class WakaClient {
  constructor(apiKey, { timezone = ENV.WAKA_TIMEZONE } = {}) {
    this.auth = authHeader(String(apiKey).trim());
    this.timezone = timezone;
    this.calls = 0;
  }

  async get(path, params = {}, attempt = 1) {
    const url = new URL(BASE + path);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    }

    await throttle();
    this.calls++;
    let res;
    try {
      res = await fetch(url, {
        headers: { Authorization: this.auth, Accept: 'application/json' },
        redirect: 'manual', // WakaTime sometimes answers 302 instead of 429
        signal: AbortSignal.timeout(60000),
      });
    } catch (err) {
      if (attempt < 5) {
        await sleep(2000 * attempt);
        return this.get(path, params, attempt + 1);
      }
      throw new WakaApiError(`Network error on ${path}: ${err.message}`, 0);
    }

    if (res.status === 200) return res.json();

    if (RETRYABLE.has(res.status) && attempt < 5) {
      const retryAfter = Number(res.headers.get('retry-after')) * 1000;
      await sleep(retryAfter || 5000 * attempt);
      return this.get(path, params, attempt + 1);
    }

    let body = '';
    try {
      body = (await res.text()).slice(0, 500);
    } catch {
      /* ignore */
    }
    throw new WakaApiError(`WakaTime ${res.status} on ${path}: ${body}`, res.status);
  }

  currentUser() {
    return this.get('/users/current');
  }

  // One-day summary. With `project`, the response also has branches and entities (files).
  summaries(date, project) {
    return this.get('/users/current/summaries', { start: date, end: date, project, timezone: this.timezone });
  }

  durations(date, sliceBy = 'project') {
    return this.get('/users/current/durations', { date, slice_by: sliceBy, timezone: this.timezone });
  }

  // Heartbeats use the timezone set on the developer's WakaTime account.
  heartbeats(date) {
    return this.get('/users/current/heartbeats', { date });
  }

  // Editors / plugins / AI tools the developer has used, with the AI model WakaTime detected.
  userAgents() {
    return this.get('/users/current/user_agents');
  }

  // All the developer's projects with last activity + linked repository (1 call — used by the live job).
  projects() {
    return this.get('/users/current/projects');
  }

  // Commits WakaTime links to a project (needs the project's repository connected in WakaTime).
  commits(project, page = 1) {
    return this.get(`/users/current/projects/${encodeURIComponent(project)}/commits`, { page });
  }
}

/**
 * Checks a key with WakaTime before it is saved.
 * @returns {{ wakaUserId, wakaUsername, displayName, email, timezone, timezoneWarning }}
 * @throws WakaApiError — isAuthError when WakaTime rejects the key
 */
const verifyApiKey = async (apiKey) => {
  const me = await new WakaClient(apiKey).currentUser();
  const u = me.data || {};
  const timezoneWarning =
    u.timezone && u.timezone !== ENV.WAKA_TIMEZONE
      ? `WakaTime account timezone is ${u.timezone}; reports use ${ENV.WAKA_TIMEZONE}. ` +
        `Ask the developer to set ${ENV.WAKA_TIMEZONE} in WakaTime settings so days line up.`
      : null;
  return {
    wakaUserId: u.id || null,
    wakaUsername: u.username || u.display_name || null,
    displayName: u.display_name || u.full_name || null,
    email: u.email || null,
    timezone: u.timezone || null,
    timezoneWarning,
  };
};

module.exports = { WakaClient, WakaApiError, verifyApiKey, isOAuthToken };
