'use client';

import { useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Check, ImageUp, Palette, Plus, RotateCcw, ShieldCheck, Star, Trash2, UserRound } from 'lucide-react';
import { showAlert } from '@/components/common/AlertHandler';
import { BRAND } from '@/config/brand.config';
import { isAdminUser } from '@/utils/auth-store';
import { cn } from '@/lib/utils';
import {
  COLOR_THEMES,
  ColorTheme,
  CustomThemeDef,
  DEFAULT_THEME_ID,
  ThemeConfig,
  applyColorTheme,
  applyUserTheme,
  buildCustomTheme,
  clearUserThemeChoice,
  getAllThemes,
  getAllowedThemes,
  getUserThemeChoice,
  resolveLogoSrc,
  resolveUserTheme,
  saveUserThemeChoice,
} from '@/utils/theme';
import { useGetThemeQuery, useUpdateThemeMutation, useUploadThemeLogoMutation } from '@/redux/slice/themeSlice';

const noSubscribe = () => () => {};

/** Miniature of the app shell in a theme's colours. */
function ThemePreview({ theme, bg }: { theme: ColorTheme; bg?: string }) {
  return (
    <div className='flex h-20 overflow-hidden rounded-lg border border-black/5'>
      <div className='flex w-[30%] flex-col gap-1.5 p-2' style={{ background: bg || theme.sidebarBg }}>
        <span className='h-1.5 w-8 rounded-full bg-white/30' />
        <span className='h-3 rounded' style={{ background: theme.primary }} />
        <span className='h-1.5 w-10 rounded-full bg-white/15' />
        <span className='h-1.5 w-7 rounded-full bg-white/15' />
      </div>
      <div className='flex flex-1 flex-col'>
        <div className='h-3' style={{ background: bg || theme.topbarBg }} />
        <div className='flex flex-1 gap-1.5 bg-[var(--app-canvas)] p-2'>
          <span className='flex-1 rounded bg-white shadow-xs' />
          <span className='flex-1 rounded bg-white shadow-xs' />
        </div>
      </div>
    </div>
  );
}

/** Black or white text, whichever reads better on the colour. */
const textOn = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? '#141414' : '#ffffff';
};

const slug = (name: string) =>
  `custom-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'theme'}-${Date.now().toString(36)}`;

export default function AppearancePage() {
  const isAdmin = useSyncExternalStore(noSubscribe, isAdminUser, () => false);
  const { data: themeData, isLoading } = useGetThemeQuery(undefined);
  const config = themeData?.data as ThemeConfig | undefined;

  /* ── My theme (this user, this browser) ─────────────────────────────── */
  const savedChoice = useSyncExternalStore(
    noSubscribe,
    () => JSON.stringify(getUserThemeChoice()),
    () => 'null',
  );
  const [picked, setPicked] = useState<{ themeId: string; customBg?: string } | null>(null);
  const resolved = useMemo(() => resolveUserTheme(config), [config, savedChoice]); // eslint-disable-line react-hooks/exhaustive-deps
  const mine = picked ?? resolved;
  const hasOwnChoice = picked ? true : savedChoice !== 'null';
  const allowedThemes = getAllowedThemes(config);

  const chooseMine = (next: { themeId: string; customBg?: string }) => {
    setPicked(next);
    saveUserThemeChoice(next);
    applyColorTheme(next.themeId, next.customBg, getAllThemes(config));
  };

  const resetMine = () => {
    clearUserThemeChoice();
    setPicked(null);
    applyUserTheme(config);
    showAlert({ status: 'success', message: 'Back to the organisation default theme' });
  };

  /* ── Organisation settings (admin) ──────────────────────────────────── */
  const [draft, setDraft] = useState<Pick<ThemeConfig, 'allowedThemeIds' | 'defaultThemeId' | 'customThemes'> | null>(null);
  const org = draft ?? {
    allowedThemeIds: config?.allowedThemeIds ?? COLOR_THEMES.map((t) => t.id),
    defaultThemeId: config?.defaultThemeId ?? DEFAULT_THEME_ID,
    customThemes: config?.customThemes ?? [],
  };
  const orgThemes = [...COLOR_THEMES, ...org.customThemes.map(buildCustomTheme)];
  const editOrg = (patch: Partial<typeof org>) => setDraft({ ...org, ...patch });

  const [updateTheme, { isLoading: saving }] = useUpdateThemeMutation();
  const [uploadLogo, { isLoading: uploading }] = useUploadThemeLogoMutation();
  const fileRef = useRef<HTMLInputElement>(null);

  const [newTheme, setNewTheme] = useState({ name: '', primary: '#1e5aa8', sidebarBg: '#0f172a', topbarBg: '#1e293b' });

  const toggleAllowed = (id: string) => {
    const on = org.allowedThemeIds.includes(id);
    if (on && org.allowedThemeIds.length === 1) {
      return showAlert({ status: 'warning', message: 'Keep at least one theme available.' });
    }
    const allowedThemeIds = on ? org.allowedThemeIds.filter((x) => x !== id) : [...org.allowedThemeIds, id];
    editOrg({
      allowedThemeIds,
      defaultThemeId: allowedThemeIds.includes(org.defaultThemeId) ? org.defaultThemeId : allowedThemeIds[0],
    });
  };

  const addTheme = () => {
    const name = newTheme.name.trim();
    if (!name) return showAlert({ status: 'warning', message: 'Give the new theme a name.' });
    const def: CustomThemeDef = { ...newTheme, id: slug(name), name, activeText: textOn(newTheme.primary) };
    editOrg({ customThemes: [...org.customThemes, def], allowedThemeIds: [...org.allowedThemeIds, def.id] });
    setNewTheme((t) => ({ ...t, name: '' }));
  };

  const removeTheme = (id: string) => {
    const allowedThemeIds = org.allowedThemeIds.filter((x) => x !== id);
    editOrg({
      customThemes: org.customThemes.filter((t) => t.id !== id),
      allowedThemeIds: allowedThemeIds.length ? allowedThemeIds : [DEFAULT_THEME_ID],
      defaultThemeId: org.defaultThemeId === id ? allowedThemeIds[0] || DEFAULT_THEME_ID : org.defaultThemeId,
    });
  };

  const saveOrg = async () => {
    try {
      const res = await updateTheme(org).unwrap();
      setDraft(null);
      showAlert({ status: 'success', message: res?.msg || 'Appearance settings saved' });
    } catch (err: unknown) {
      const msg = (err as { data?: { msg?: string } })?.data?.msg;
      showAlert({ status: 'error', message: msg || 'Could not save the appearance settings' });
    }
  };

  const onLogoFile = async (file?: File) => {
    if (!file) return;
    try {
      const res = await uploadLogo(file).unwrap();
      showAlert({ status: 'success', message: res?.msg || 'Logo updated' });
    } catch (err: unknown) {
      const msg = (err as { data?: { msg?: string } })?.data?.msg;
      showAlert({ status: 'error', message: msg || 'Could not upload the logo' });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const resetLogo = async () => {
    try {
      await updateTheme({ logoUrl: '' }).unwrap();
      showAlert({ status: 'success', message: 'Default logo restored' });
    } catch {
      showAlert({ status: 'error', message: 'Could not reset the logo' });
    }
  };

  const logoSrc = resolveLogoSrc(config?.logoUrl) || BRAND.logo.primary;

  return (
    <div className='space-y-5'>
      {/* ── My theme ─────────────────────────────────────────────────────── */}
      <section className='ui-card'>
        <header className='ui-card-head'>
          <div className='flex items-center gap-2.5'>
            <span className='flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--action-soft)] text-[var(--action)]'>
              <UserRound className='h-4 w-4' />
            </span>
            <div>
              <p className='ui-card-title'>My theme</p>
              <p className='text-[12px] text-slate-500'>Only changes your screens, on this browser.</p>
            </div>
          </div>
          {hasOwnChoice && (
            <button type='button' onClick={resetMine} className='ui-btn ui-btn-ghost ui-btn-sm'>
              <RotateCcw /> Use default
            </button>
          )}
        </header>
        <div className='ui-card-body'>
          {isLoading ? (
            <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
              {[0, 1, 2].map((i) => (
                <div key={i} className='h-32 animate-pulse rounded-xl bg-slate-100' />
              ))}
            </div>
          ) : (
            <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
              {allowedThemes.map((theme) => {
                const selected = mine.themeId === theme.id;
                return (
                  <button
                    key={theme.id}
                    type='button'
                    aria-pressed={selected}
                    onClick={() => chooseMine({ themeId: theme.id, customBg: mine.customBg })}
                    className={cn(
                      'rounded-xl border p-2.5 text-left transition-all hover:border-slate-300',
                      selected ? 'border-transparent ring-2 ring-[var(--action)] ring-offset-2' : 'border-slate-200',
                    )}>
                    <ThemePreview theme={theme} bg={selected ? mine.customBg : undefined} />
                    <div className='mt-2.5 flex items-center justify-between gap-2 px-0.5'>
                      <span className='flex min-w-0 items-center gap-2 text-[13px] font-semibold text-slate-900'>
                        <span className='h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10' style={{ background: theme.primary }} />
                        <span className='truncate'>{theme.name}</span>
                      </span>
                      {selected ? (
                        <span className='inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--action)] text-white'>
                          <Check className='h-3 w-3' strokeWidth={3} />
                        </span>
                      ) : theme.id === config?.defaultThemeId ? (
                        <span className='text-[11px] font-medium text-slate-500'>Default</span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Own sidebar colour */}
          <div className='mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3'>
            <span className='text-[13px] font-medium text-slate-700'>My sidebar &amp; top bar colour</span>
            <label className='relative h-8 w-12 cursor-pointer overflow-hidden rounded-md border border-slate-300'>
              <input
                type='color'
                aria-label='Pick a sidebar colour'
                value={mine.customBg || allowedThemes.find((t) => t.id === mine.themeId)?.sidebarBg || '#141414'}
                onChange={(e) => chooseMine({ themeId: mine.themeId, customBg: e.target.value })}
                className='absolute -inset-2 h-[calc(100%+16px)] w-[calc(100%+16px)] cursor-pointer'
              />
            </label>
            <span className='font-mono text-xs text-slate-500'>{mine.customBg || 'Theme colour'}</span>
            {mine.customBg && (
              <button
                type='button'
                className='ui-btn ui-btn-ghost ui-btn-sm ml-auto'
                onClick={() => chooseMine({ themeId: mine.themeId })}>
                Clear
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Organisation (admin only) ───────────────────────────────────── */}
      {isAdmin && (
        <section className='ui-card'>
          <header className='ui-card-head'>
            <div className='flex items-center gap-2.5'>
              <span className='flex h-8 w-8 items-center justify-center rounded-lg bg-theme-primary text-theme-active-text'>
                <ShieldCheck className='h-4 w-4' />
              </span>
              <div>
                <p className='ui-card-title'>Organisation appearance</p>
                <p className='text-[12px] text-slate-500'>Administrators only · applies to every user.</p>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              {draft && (
                <button type='button' onClick={() => setDraft(null)} className='ui-btn ui-btn-ghost ui-btn-sm'>
                  Discard
                </button>
              )}
              <button type='button' onClick={saveOrg} disabled={!draft || saving} className='ui-btn ui-btn-primary ui-btn-sm'>
                <Check /> {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </header>

          <div className='ui-card-body space-y-6'>
            {/* Logo */}
            <div>
              <p className='ui-label mb-2'>Logo</p>
              <div className='flex flex-wrap items-center gap-4'>
                <div className='flex h-16 w-48 items-center justify-center rounded-lg px-3' style={{ background: 'var(--theme-sidebar-bg)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoSrc} alt='Current logo' className='max-h-10 max-w-full object-contain' />
                </div>
                <input
                  ref={fileRef}
                  type='file'
                  accept='image/png,image/jpeg,image/svg+xml,image/webp'
                  className='hidden'
                  onChange={(e) => onLogoFile(e.target.files?.[0])}
                />
                <button type='button' onClick={() => fileRef.current?.click()} disabled={uploading} className='ui-btn ui-btn-secondary ui-btn-sm'>
                  <ImageUp /> {uploading ? 'Uploading…' : 'Upload new logo'}
                </button>
                <button type='button' onClick={resetLogo} className='ui-btn ui-btn-ghost ui-btn-sm'>
                  <RotateCcw /> Default logo
                </button>
                <p className='w-full text-xs text-slate-500'>PNG or SVG with a transparent background, shown on the dark sidebar and login screen. Saved immediately.</p>
              </div>
            </div>

            {/* Themes users can pick */}
            <div>
              <p className='ui-label mb-1'>Themes users can choose</p>
              <p className='mb-3 text-xs text-slate-500'>
                Tick the themes users may select and mark one <b>default</b> for users who haven&apos;t chosen.
              </p>
              <ul className='divide-y divide-slate-100 rounded-xl border border-slate-200'>
                {orgThemes.map((theme) => {
                  const allowed = org.allowedThemeIds.includes(theme.id);
                  const isDefault = org.defaultThemeId === theme.id;
                  const isCustom = theme.id.startsWith('custom-');
                  return (
                    <li key={theme.id} className='flex items-center gap-3 px-3 py-2.5'>
                      <button
                        type='button'
                        role='checkbox'
                        aria-checked={allowed}
                        aria-label={`Allow ${theme.name}`}
                        onClick={() => toggleAllowed(theme.id)}
                        className='ui-check'
                        data-checked={allowed}>
                        {allowed && <Check />}
                      </button>
                      <span className='flex h-7 w-12 shrink-0 overflow-hidden rounded-md ring-1 ring-black/10'>
                        <span className='w-1/3' style={{ background: theme.sidebarBg }} />
                        <span className='w-1/3' style={{ background: theme.primary }} />
                        <span className='w-1/3' style={{ background: theme.topbarBg }} />
                      </span>
                      <span className='min-w-0 flex-1'>
                        <span className='block truncate text-[13px] font-semibold text-slate-900'>{theme.name}</span>
                        <span className='block text-[11px] text-slate-500'>{isCustom ? 'Custom theme' : 'Built-in'}</span>
                      </span>
                      <button
                        type='button'
                        disabled={!allowed}
                        onClick={() => editOrg({ defaultThemeId: theme.id })}
                        className={cn(
                          'ui-btn ui-btn-sm',
                          isDefault ? 'ui-btn-primary' : 'ui-btn-ghost',
                        )}>
                        <Star className={cn(isDefault && 'fill-current')} />
                        {isDefault ? 'Default' : 'Make default'}
                      </button>
                      {isCustom && (
                        <button
                          type='button'
                          aria-label={`Delete ${theme.name}`}
                          data-tip='Delete theme'
                          onClick={() => removeTheme(theme.id)}
                          className='ui-btn ui-btn-ghost ui-btn-icon hover:text-[var(--color-status-down)]'>
                          <Trash2 />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* New theme */}
            <div className='rounded-xl border border-dashed border-slate-300 p-4'>
              <p className='ui-label mb-3 flex items-center gap-2'>
                <Palette className='h-4 w-4 text-slate-400' /> Create a theme
              </p>
              <div className='grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]'>
                <div className='grid grid-cols-1 gap-3 sm:grid-cols-4'>
                  <div className='ui-field sm:col-span-1'>
                    <label htmlFor='nt-name' className='ui-label'>Name</label>
                    <input
                      id='nt-name'
                      className='ui-input h-10'
                      value={newTheme.name}
                      maxLength={40}
                      placeholder='e.g. Night shift'
                      onChange={(e) => setNewTheme((t) => ({ ...t, name: e.target.value }))}
                    />
                  </div>
                  {(
                    [
                      ['primary', 'Highlight'],
                      ['sidebarBg', 'Sidebar'],
                      ['topbarBg', 'Top bar'],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className='ui-field'>
                      <label className='ui-label'>{label}</label>
                      <label className='flex h-10 cursor-pointer items-center gap-2 rounded-[10px] border border-slate-200 bg-white px-2'>
                        <span className='relative h-6 w-8 overflow-hidden rounded'>
                          <input
                            type='color'
                            value={newTheme[key]}
                            onChange={(e) => setNewTheme((t) => ({ ...t, [key]: e.target.value }))}
                            className='absolute -inset-2 h-[calc(100%+16px)] w-[calc(100%+16px)] cursor-pointer'
                          />
                        </span>
                        <span className='font-mono text-xs text-slate-600'>{newTheme[key]}</span>
                      </label>
                    </div>
                  ))}
                </div>
                <div className='flex flex-col justify-end gap-2 md:w-44'>
                  <ThemePreview
                    theme={buildCustomTheme({ ...newTheme, id: 'custom-preview', name: 'Preview', activeText: textOn(newTheme.primary) })}
                  />
                  <button type='button' onClick={addTheme} className='ui-btn ui-btn-secondary ui-btn-sm'>
                    <Plus /> Add theme
                  </button>
                </div>
              </div>
              <p className='mt-2 text-xs text-slate-500'>New themes are added to the list above — click <b>Save changes</b> to publish them.</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
