'use client';

import { BRAND } from '@/config/brand.config';
import { API_URL, USER_DETAILS_KEY } from '@/config/config';

export interface ColorTheme {
  id: string;
  name: string;
  primary: string;
  gradientFrom: string;
  gradientTo: string;
  glow: string;
  glowBorder: string;
  sidebarBg: string;
  topbarBg: string;
  border: string;
  activeText: string;
  sidebarText: string;
  topbarText: string;
  /** Read colors from theme/tokens.css instead of overriding them inline. */
  usesTokens?: boolean;
}

export const COLOR_THEMES: ColorTheme[] = [
  // Default = the customer's brand colors from config/brand.config.ts.
  // These values only draw the swatch; keep id 'yellow' — it's stored in the DB.
  {
    id: 'yellow',
    name: `${BRAND.company.name} brand`,
    primary: BRAND.colors.brand,
    gradientFrom: BRAND.colors.brand,
    gradientTo: BRAND.colors.brand,
    glow: 'transparent',
    glowBorder: 'transparent',
    sidebarBg: BRAND.colors.shell,
    topbarBg: BRAND.colors.topbar,
    border: 'rgba(255, 255, 255, 0.08)',
    activeText: BRAND.colors.brandText,
    sidebarText: '#c8c8c4',
    topbarText: '#f7f7f6',
    usesTokens: true,
  },
  {
    id: 'cyan',
    name: 'Ocean Cyan',
    primary: '#06b6d4',
    gradientFrom: '#06b6d4',
    gradientTo: '#2563eb',
    glow: 'rgba(6, 182, 212, 0.25)',
    glowBorder: 'rgba(6, 182, 212, 0.35)',
    sidebarBg: '#071424',
    topbarBg: '#091a30',
    border: '#162b48',
    activeText: '#ffffff',
    sidebarText: '#94a3b8',
    topbarText: '#ffffff',
  },
  {
    id: 'green',
    name: 'Forest Green',
    primary: '#10b981',
    gradientFrom: '#10b981',
    gradientTo: '#047857',
    glow: 'rgba(16, 185, 129, 0.25)',
    glowBorder: 'rgba(16, 185, 129, 0.35)',
    sidebarBg: '#071d11',
    topbarBg: '#0b2918',
    border: '#163b25',
    activeText: '#ffffff',
    sidebarText: '#a7f3d0',
    topbarText: '#ffffff',
  },
  {
    id: 'purple',
    name: 'Royal Purple',
    primary: '#8b5cf6',
    gradientFrom: '#8b5cf6',
    gradientTo: '#4f46e5',
    glow: 'rgba(139, 92, 246, 0.25)',
    glowBorder: 'rgba(139, 92, 246, 0.35)',
    sidebarBg: '#0f0924',
    topbarBg: '#150d30',
    border: '#25174f',
    activeText: '#ffffff',
    sidebarText: '#c4b5fd',
    topbarText: '#ffffff',
  },
  {
    id: 'orange',
    name: 'Sunset Orange',
    primary: '#f97316',
    gradientFrom: '#f97316',
    gradientTo: '#db2777',
    glow: 'rgba(249, 115, 22, 0.25)',
    glowBorder: 'rgba(249, 115, 22, 0.35)',
    sidebarBg: '#1d0a07',
    topbarBg: '#290e0b',
    border: '#3f1712',
    activeText: '#ffffff',
    sidebarText: '#fdba74',
    topbarText: '#ffffff',
  },
  {
    id: 'blue',
    name: 'Tech Blue',
    primary: '#3b82f6',
    gradientFrom: '#3b82f6',
    gradientTo: '#1d4ed8',
    glow: 'rgba(59, 130, 246, 0.25)',
    glowBorder: 'rgba(59, 130, 246, 0.35)',
    sidebarBg: '#070e24',
    topbarBg: '#0a1430',
    border: '#17234f',
    activeText: '#ffffff',
    sidebarText: '#93c5fd',
    topbarText: '#ffffff',
  },
];

/* ─── Organisation settings (admin, from /common/theme/getTheme) ──────────── */

/** A theme created by the admin on the Appearance page. */
export interface CustomThemeDef {
  id: string; // "custom-…"
  name: string;
  primary: string;
  sidebarBg: string;
  topbarBg: string;
  activeText: string;
}

export interface ThemeConfig {
  logoUrl: string;
  allowedThemeIds: string[];
  defaultThemeId: string;
  customThemes: CustomThemeDef[];
}

export const DEFAULT_THEME_ID = 'yellow';

/** Logo URL from the settings → loadable src (uploaded files live on the API). */
export const resolveLogoSrc = (url?: string | null) => {
  if (!url) return '';
  if (/^(https?:|data:)/i.test(url)) return url;
  return url.startsWith('/uploads/') ? `${API_URL}${url}` : url;
};

const hexAlpha = (hex: string, alpha: number) =>
  `${hex}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`;

/** Admin-made theme → full ColorTheme. */
export const buildCustomTheme = (t: CustomThemeDef): ColorTheme => ({
  id: t.id,
  name: t.name,
  primary: t.primary,
  gradientFrom: t.primary,
  gradientTo: t.primary,
  glow: hexAlpha(t.primary, 0.14),
  glowBorder: hexAlpha(t.primary, 0.38),
  sidebarBg: t.sidebarBg,
  topbarBg: t.topbarBg,
  border: 'rgba(255, 255, 255, 0.08)',
  activeText: t.activeText || '#ffffff',
  sidebarText: '#c8c8c4',
  topbarText: '#f7f7f6',
});

/** Built-in + admin-made themes. */
export const getAllThemes = (config?: Partial<ThemeConfig> | null): ColorTheme[] => [
  ...COLOR_THEMES,
  ...(config?.customThemes ?? []).map(buildCustomTheme),
];

/** Themes users may pick (the admin's list; all built-ins if nothing is set). */
export const getAllowedThemes = (config?: Partial<ThemeConfig> | null): ColorTheme[] => {
  const all = getAllThemes(config);
  const allowed = config?.allowedThemeIds?.length ? all.filter((t) => config.allowedThemeIds!.includes(t.id)) : all;
  return allowed.length ? allowed : [COLOR_THEMES[0]];
};

/* ─── The logged-in user's own choice (this browser only) ─────────────────── */

export interface UserThemeChoice {
  themeId: string;
  /** Optional own sidebar / top bar colour */
  customBg?: string;
}

const LEGACY_KEYS = ['iotify-color-theme', 'iotify-custom-bg-color'];

/** One entry per user, so people sharing a PC keep their own theme. */
const choiceKey = () => {
  try {
    const raw = localStorage.getItem(USER_DETAILS_KEY);
    const username = raw ? JSON.parse(atob(raw))?.username : '';
    return `oee-theme:${username || 'guest'}`;
  } catch {
    return 'oee-theme:guest';
  }
};

export const getUserThemeChoice = (): UserThemeChoice | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(choiceKey());
    return raw ? (JSON.parse(raw) as UserThemeChoice) : null;
  } catch {
    return null;
  }
};

export const saveUserThemeChoice = (choice: UserThemeChoice) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(choiceKey(), JSON.stringify(choice));
  LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
};

export const clearUserThemeChoice = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(choiceKey());
};

/* ─── Applying ────────────────────────────────────────────────────────────── */

const SHELL_VARS = [
  '--theme-primary',
  '--theme-gradient-from',
  '--theme-gradient-to',
  '--theme-glow',
  '--theme-glow-border',
  '--theme-active-text',
  '--theme-sidebar-text',
  '--theme-topbar-text',
  '--theme-sidebar-bg',
  '--theme-topbar-bg',
  '--theme-border',
];

/** Paints a theme (no saving). `themes` must include any admin-made theme. */
export const applyColorTheme = (themeId: string, customBgColor?: string, themes: ColorTheme[] = COLOR_THEMES) => {
  if (typeof window === 'undefined') return;
  const theme = themes.find((t) => t.id === themeId) || COLOR_THEMES[0];
  const root = document.documentElement;

  if (theme.usesTokens) {
    // Fall back to the values defined in theme/tokens.css + brand.config.ts
    SHELL_VARS.forEach((name) => root.style.removeProperty(name));
  } else {
    root.style.setProperty('--theme-primary', theme.primary);
    root.style.setProperty('--theme-gradient-from', theme.gradientFrom);
    root.style.setProperty('--theme-gradient-to', theme.gradientTo);
    root.style.setProperty('--theme-glow', theme.glow);
    root.style.setProperty('--theme-glow-border', theme.glowBorder);
    root.style.setProperty('--theme-active-text', theme.activeText || '#0f172a');
    root.style.setProperty('--theme-sidebar-text', theme.sidebarText || '#94a3b8');
    root.style.setProperty('--theme-topbar-text', theme.topbarText || '#ffffff');
    root.style.setProperty('--theme-sidebar-bg', theme.sidebarBg);
    root.style.setProperty('--theme-topbar-bg', theme.topbarBg || theme.sidebarBg);
    root.style.setProperty('--theme-border', theme.border || theme.sidebarBg + '40');
  }

  if (customBgColor) {
    root.style.setProperty('--theme-sidebar-bg', customBgColor);
    root.style.setProperty('--theme-topbar-bg', customBgColor);
  }
};

/**
 * Theme for this user: their own choice if the admin still allows it,
 * otherwise the admin's default.
 */
export const resolveUserTheme = (config?: Partial<ThemeConfig> | null): UserThemeChoice => {
  const allowed = getAllowedThemes(config);
  const choice = getUserThemeChoice();
  if (choice && allowed.some((t) => t.id === choice.themeId)) return choice;
  const fallback = config?.defaultThemeId && allowed.some((t) => t.id === config.defaultThemeId)
    ? config.defaultThemeId
    : allowed[0].id;
  return { themeId: fallback };
};

/** Apply what this user should see. Call on start-up and after the config loads. */
export const applyUserTheme = (config?: Partial<ThemeConfig> | null) => {
  const { themeId, customBg } = resolveUserTheme(config);
  applyColorTheme(themeId, customBg, getAllThemes(config));
};
