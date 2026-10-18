const fs = require('fs');
const path = require('path');
const logger = require('../../../utils/logger');

/**
 * ─── Organisation appearance (admin) ────────────────────────────────────────
 * Stored in data/theme-config.json:
 *   logoUrl          logo shown in the sidebar / login (uploaded or /images/…)
 *   allowedThemeIds  themes users may pick on their Appearance page
 *   defaultThemeId   theme for users who haven't picked one
 *   customThemes     themes created by the admin [{ id, name, primary, sidebarBg, topbarBg, activeText }]
 *
 * Each user's own choice is NOT stored here — it lives in that user's browser.
 */
const themeFilePath = path.join(__dirname, '../../../data/theme-config.json');

const BUILT_IN_THEME_IDS = ['yellow', 'cyan', 'green', 'purple', 'orange', 'blue'];
const HEX = /^#[0-9a-f]{6}$/i;

const DEFAULT_CONFIG = {
  logoUrl: '/brand/logo.svg',
  allowedThemeIds: BUILT_IN_THEME_IDS,
  defaultThemeId: 'yellow',
  customThemes: [],
};

const { hasScope } = require('../../../communications/middleware/access');

/** Organisation theme / logo: appearance_update scope (Super_Admin always). */
const isAdmin = (req) => hasScope(req, 'appearance_update');

/** Reads the file; also upgrades the old { themeId, customBgColor } format. */
const readConfig = () => {
  if (!fs.existsSync(themeFilePath)) return { ...DEFAULT_CONFIG };
  const raw = JSON.parse(fs.readFileSync(themeFilePath, 'utf8') || '{}');
  const customThemes = Array.isArray(raw.customThemes) ? raw.customThemes : [];
  const knownIds = [...BUILT_IN_THEME_IDS, ...customThemes.map((t) => t.id)];
  const allowed = (Array.isArray(raw.allowedThemeIds) ? raw.allowedThemeIds : DEFAULT_CONFIG.allowedThemeIds).filter((id) =>
    knownIds.includes(id),
  );
  const defaultThemeId = raw.defaultThemeId || raw.themeId || DEFAULT_CONFIG.defaultThemeId;
  return {
    logoUrl: raw.logoUrl || DEFAULT_CONFIG.logoUrl,
    allowedThemeIds: allowed.length ? allowed : [defaultThemeId],
    defaultThemeId: allowed.includes(defaultThemeId) || !allowed.length ? defaultThemeId : allowed[0],
    customThemes,
  };
};

/** Response shape — `themeId` kept for older screens (= the default theme). */
const toResponse = (config) => ({ ...config, themeId: config.defaultThemeId, customBgColor: null });

/** Returns a list of problems (empty = valid). */
const validate = (config) => {
  const errors = [];
  const ids = new Set();
  config.customThemes.forEach((t, i) => {
    const label = t.name || `Custom theme ${i + 1}`;
    if (!String(t.name || '').trim()) errors.push(`Custom theme ${i + 1}: name is required.`);
    if (!/^custom-[a-z0-9-]+$/.test(String(t.id || ''))) errors.push(`${label}: invalid id.`);
    if (ids.has(t.id)) errors.push(`${label}: duplicate id.`);
    ids.add(t.id);
    ['primary', 'sidebarBg', 'topbarBg', 'activeText'].forEach((key) => {
      if (!HEX.test(String(t[key] || ''))) errors.push(`${label}: ${key} must be a colour like #1e5aa8.`);
    });
  });
  const knownIds = [...BUILT_IN_THEME_IDS, ...ids];
  if (!config.allowedThemeIds.length) errors.push('Allow at least one theme.');
  config.allowedThemeIds.forEach((id) => {
    if (!knownIds.includes(id)) errors.push(`Unknown theme "${id}".`);
  });
  if (!config.allowedThemeIds.includes(config.defaultThemeId)) errors.push('The default theme must be one of the allowed themes.');
  return errors;
};

// GET /common/theme/getTheme — public (the login page needs the logo and default theme)
const getTheme = async (req, res) => {
  try {
    return res.json({ success: true, data: toResponse(readConfig()) });
  } catch (err) {
    console.error('[getTheme] error:', err);
    logger.error('[getTheme] error:', err);
    return res.status(500).json({ msg: 'Server error while fetching theme configuration.' });
  }
};

// PUT /common/theme/updateTheme — admin only
const updateTheme = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ success: false, msg: 'Permission denied. Only admins can change the appearance settings.' });
    }
    const current = readConfig();
    const body = req.body || {};
    const next = {
      logoUrl: body.logoUrl !== undefined ? String(body.logoUrl || DEFAULT_CONFIG.logoUrl) : current.logoUrl,
      allowedThemeIds: Array.isArray(body.allowedThemeIds) ? [...new Set(body.allowedThemeIds.map(String))] : current.allowedThemeIds,
      defaultThemeId: body.defaultThemeId ? String(body.defaultThemeId) : current.defaultThemeId,
      customThemes: Array.isArray(body.customThemes)
        ? body.customThemes.map((t) => ({
            id: String(t.id || ''),
            name: String(t.name || '').trim().slice(0, 40),
            primary: String(t.primary || ''),
            sidebarBg: String(t.sidebarBg || ''),
            topbarBg: String(t.topbarBg || ''),
            activeText: String(t.activeText || '#ffffff'),
          }))
        : current.customThemes,
    };

    const errors = validate(next);
    if (errors.length) return res.status(400).json({ success: false, msg: errors[0], errors });

    fs.writeFileSync(themeFilePath, JSON.stringify(next, null, 2), 'utf8');
    return res.json({ success: true, msg: 'Appearance settings saved.', data: toResponse(next) });
  } catch (err) {
    console.error('[updateTheme] error:', err);
    logger.error('[updateTheme] error:', err);
    return res.status(500).json({ msg: 'Server error while updating theme configuration.' });
  }
};

// POST /common/theme/uploadLogo (multipart "logo") — admin only; saves it as the logo
const uploadLogo = async (req, res) => {
  try {
    if (!isAdmin(req)) {
      if (req.file?.path) fs.unlink(req.file.path, () => {});
      return res.status(403).json({ success: false, msg: 'Permission denied. Only admins can change the logo.' });
    }
    if (!req.file) return res.status(400).json({ success: false, msg: 'Choose an image file.' });
    if (!/^image\/(png|jpe?g|svg\+xml|webp)$/i.test(req.file.mimetype)) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ success: false, msg: 'Logo must be a PNG, JPG, SVG or WebP image.' });
    }
    const next = { ...readConfig(), logoUrl: `/uploads/${req.file.filename}` };
    fs.writeFileSync(themeFilePath, JSON.stringify(next, null, 2), 'utf8');
    return res.json({ success: true, msg: 'Logo updated.', data: toResponse(next) });
  } catch (err) {
    console.error('[uploadLogo] error:', err);
    logger.error('[uploadLogo] error:', err);
    return res.status(500).json({ msg: 'Server error while uploading the logo.' });
  }
};

module.exports = {
  getTheme,
  updateTheme,
  uploadLogo,
};
