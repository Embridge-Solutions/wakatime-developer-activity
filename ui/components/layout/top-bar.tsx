'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Check, ChevronDown, ChevronRight, Palette, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserAvatar } from '../user/user-avatar';
import { menuItems, profileMenuData } from '@/config/data-config';
import { clearTokens } from '@/utils/auth';
import { useSearch } from '@/contexts/search-context';
import { useUserLogoutMutation } from '@/redux/slice/auth';
import { getUserData } from '@/utils/auth-store';
import { SearchHighlight } from '../common/search-highlight';
import { ConfirmActionDialog } from '../common/confirmationDialog';
import { showAlert } from '../common/AlertHandler';
import { useGetThemeQuery } from '@/redux/slice/themeSlice';
import {
  ThemeConfig,
  applyColorTheme,
  getAllThemes,
  getAllowedThemes,
  resolveUserTheme,
  saveUserThemeChoice,
} from '@/utils/theme';

interface TopBarProps {
  sidebarCollapsed: boolean;
  onToggleSidebar?: () => void;
}

/** Live clock — null until mounted so server and client HTML match. */
function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const first = setTimeout(() => setNow(new Date()), 0);
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);
  return now;
}

interface TopBarUser {
  name: string;
  username: string;
  role: string;
}

const readUser = (): TopBarUser | null => {
  const data = getUserData();
  if (!data) return null;
  const roles = Array.isArray(data.roles)
    ? data.roles
    : data.roles
      ? [data.roles]
      : [];
  return {
    name:
      `${data.firstName || ''} ${data.lastName || ''}`.trim() ||
      data.username ||
      'User',
    username: data.username || '',
    role: String(roles[0] ?? 'Member'),
  };
};

/**
 * Top bar: active page on the left; search, live clock and profile on the right.
 * Colors come from the theme (--theme-topbar-*).
 */
export const TopBar: React.FC<TopBarProps> = () => {
  const router = useRouter();
  const [userLogout] = useUserLogoutMutation();
  const now = useNow();
  const { searchQuery, setSearchQuery, pageContent, setFirstMatchId } =
    useSearch();

  const [user, setUser] = useState<TopBarUser | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  // Quick theme picker in the profile menu (this user only)
  const { data: themeData } = useGetThemeQuery(undefined);
  const themeConfig = themeData?.data as ThemeConfig | undefined;
  const [myThemeId, setMyThemeId] = useState<string | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Logged-in user lives in localStorage → read after mount
  useEffect(() => {
    const t = setTimeout(() => setUser(readUser()), 0);
    return () => clearTimeout(t);
  }, []);

  // Close popovers on outside click / Esc; Ctrl/⌘ + K focuses search
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node))
        setShowProfile(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setShowResults(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setShowResults(true);
      }
      if (e.key === 'Escape') {
        setShowResults(false);
        setShowProfile(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const q = searchQuery.trim().toLowerCase();
  const navItems = [
    ...menuItems,
    ...profileMenuData.filter((i) => i.navigation),
  ];
  const results = q
    ? navItems.filter(
        (i) =>
          i.label.toLowerCase().includes(q) || i.path.toLowerCase().includes(q),
      )
    : [];
  const pageMatches = q
    ? pageContent.filter((i) => i.text.toLowerCase().includes(q)).length
    : 0;

  const go = (path: string) => {
    router.push(path);
    setSearchQuery('');
    setShowResults(false);
  };

  const handleLogoutConfirm = async () => {
    try {
      await userLogout().unwrap();
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      clearTokens();
      router.push('/login');
    }
  };

  return (
    <>
      <header className='relative z-40 flex h-14 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-4 text-slate-900'>
        {/* ── Left: search ──────────────────────────────────────────────── */}
        <div ref={searchRef} className='relative w-full max-w-md'>
          <div className='flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 transition-all focus-within:border-[var(--action)] focus-within:bg-white focus-within:shadow-[0_0_0_4px_var(--action-soft)]'>
            <Search className='h-4 w-4 shrink-0 text-slate-400' />
            <input
              ref={searchInputRef}
              type='text'
              name='search'
              autoComplete='off'
              value={searchQuery}
              placeholder='Search pages or this page…'
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setFirstMatchId(null);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && results.length > 0)
                  go(results[0].path);
              }}
              className='min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400'
            />
            {searchQuery ? (
              <button
                type='button'
                aria-label='Clear search'
                onClick={() => setSearchQuery('')}
                className='rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700'>
                <X className='h-3.5 w-3.5' />
              </button>
            ) : (
              <kbd className='hidden rounded-md border border-slate-200 bg-white px-1.5 py-px font-mono text-[10px] text-slate-400 sm:block'>
                Ctrl K
              </kbd>
            )}
          </div>

          {showResults && q && (
            <div className='ui-menu absolute left-0 top-full mt-2 w-full min-w-80 animate-in fade-in slide-in-from-top-1 duration-150'>
              {results.length > 0 ? (
                <div className='ui-menu-list'>
                  <p className='px-2.5 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-400'>
                    Pages
                  </p>
                  {results.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.path}
                        type='button'
                        onClick={() => go(item.path)}
                        className='ui-menu-item'>
                        <span className='flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600'>
                          {Icon && <Icon className='h-4 w-4' />}
                        </span>
                        <span className='min-w-0'>
                          <span className='block truncate'>
                            <SearchHighlight text={item.label.trim()} />
                          </span>
                          <span className='block truncate font-mono text-[11px] font-normal text-slate-400'>
                            {item.path}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className='ui-menu-empty'>
                  No pages match “{searchQuery}”
                </div>
              )}
              <div className='flex items-center gap-2 border-t border-slate-100 px-3 py-2 text-[11.5px] text-slate-500'>
                <Search className='h-3.5 w-3.5 text-[var(--action)]' />
                {pageMatches} {pageMatches === 1 ? 'match' : 'matches'} on this
                page
              </div>
            </div>
          )}
        </div>

        {/* ── Right: clock · profile ────────────────────────────────────── */}
        <div className='ml-auto flex shrink-0 items-center gap-3'>
          {/* Clock: time, then the date stacked beside it */}
          <div className='hidden items-center gap-3 sm:flex' aria-live='off'>
            <p className='font-mono text-[16px] font-semibold leading-none tracking-tight tabular-nums text-slate-900'>
              {now ? format(now, 'HH:mm:ss') : '--:--'}
              {/* <span className='text-[14px] font-medium text-slate-400'>
                {now ? format(now, ':ss') : ''}
              </span> */}
            </p>
            <span className='h-7 w-px bg-slate-200' />
            <div className='leading-tight'>
              <p className='text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--action)]'>
                {now ? format(now, 'EEEE') : '\u00a0'}
              </p>
              <p className='text-[12.5px] font-medium text-slate-600'>
                {now ? format(now, 'd MMMM yyyy') : '\u00a0'}
              </p>
            </div>
          </div>

          <span className='hidden h-8 w-px bg-slate-200 sm:block' />

          {/* Profile */}
          <div ref={profileRef} className='relative'>
            <button
              type='button'
              aria-haspopup='menu'
              aria-expanded={showProfile}
              onClick={() => setShowProfile((v) => !v)}
              className='flex items-center gap-2.5 rounded-xl py-1 pl-1 pr-2 transition-colors hover:bg-slate-100'>
              <span className='relative'>
                <UserAvatar
                  name={user?.name || 'User'}
                  size='sm'
                  className='ring-2 ring-theme-primary'
                />
                <span className='absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[var(--color-status-running)]' />
              </span>
              <span className='hidden min-w-0 text-left leading-tight lg:block'>
                <span className='block max-w-36 truncate text-[13px] font-semibold capitalize text-slate-900'>
                  {user?.name ?? '\u00a0'}
                </span>
                <span className='block max-w-36 truncate text-[11px] capitalize text-slate-500'>
                  {user?.role ?? '\u00a0'}
                </span>
              </span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 text-slate-400 transition-transform',
                  showProfile && 'rotate-180',
                )}
              />
            </button>
            {showProfile && (() => {
              const current = resolveUserTheme(themeConfig);
              const activeId = myThemeId ?? current.themeId;
              const themes = getAllowedThemes(themeConfig);
              const pickTheme = (id: string) => {
                setMyThemeId(id);
                saveUserThemeChoice({ themeId: id, customBg: current.customBg });
                applyColorTheme(id, current.customBg, getAllThemes(themeConfig));
                showAlert({ status: 'success', message: 'Theme changed — only for you' });
              };
              const go = (path: string) => {
                setShowProfile(false);
                router.push(path);
              };
              return (
                <div
                  role='menu'
                  className='ui-menu absolute right-0 top-full mt-2 w-80 overflow-hidden text-slate-900 animate-in fade-in slide-in-from-top-1 duration-150'>
                  {/* Who — on the user's own theme colours */}
                  <div
                    className='relative flex items-center gap-3 px-4 pb-4 pt-5 text-white'
                    style={{ background: 'linear-gradient(135deg, var(--theme-sidebar-bg), var(--theme-topbar-bg))' }}>
                    <span className='absolute inset-x-0 top-0 h-1 bg-theme-primary' />
                    <UserAvatar name={user?.name || 'User'} size='lg' className='ring-2 ring-theme-primary' />
                    <div className='min-w-0'>
                      <p className='truncate text-[15px] font-semibold capitalize'>{user?.name}</p>
                      <p className='truncate text-xs text-white/60'>@{user?.username}</p>
                      <span className='mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium capitalize'>
                        <span className='h-1.5 w-1.5 rounded-full bg-[var(--color-status-running)]' />
                        {user?.role}
                      </span>
                    </div>
                  </div>

                  {/* My theme — quick switch */}
                  <div className='border-b border-slate-100 px-4 py-3'>
                    <div className='mb-2 flex items-center justify-between'>
                      <span className='flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500'>
                        <Palette className='h-3.5 w-3.5' /> My theme
                      </span>
                      <button
                        type='button'
                        onClick={() => go('/appearance')}
                        className='text-[11.5px] font-semibold text-[var(--action)] hover:underline'>
                        All options
                      </button>
                    </div>
                    <div className='flex flex-wrap gap-2'>
                      {themes.map((t) => {
                        const on = t.id === activeId;
                        return (
                          <button
                            key={t.id}
                            type='button'
                            role='menuitemradio'
                            aria-checked={on}
                            aria-label={t.name}
                            data-tip={t.name}
                            onClick={() => pickTheme(t.id)}
                            className={cn(
                              'relative h-8 w-8 overflow-hidden rounded-full ring-1 ring-black/10 transition-transform hover:scale-110',
                              on && 'ring-2 ring-[var(--action)] ring-offset-2',
                            )}
                            style={{ background: `linear-gradient(135deg, ${t.sidebarBg} 50%, ${t.primary} 50%)` }}>
                            {on && (
                              <span className='absolute inset-0 flex items-center justify-center'>
                                <span className='flex h-4 w-4 items-center justify-center rounded-full bg-white text-[var(--action)] shadow'>
                                  <Check className='h-3 w-3' strokeWidth={3} />
                                </span>
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Account */}
                  <div className='ui-menu-list'>
                    {profileMenuData
                      .filter((i) => i.navigation)
                      .map((item) => {
                        const Icon = item.icon;
                        return (
                          <button key={item.path} type='button' role='menuitem' onClick={() => go(item.path)} className='ui-menu-item'>
                            <span className='flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600'>
                              <Icon className='h-4 w-4' />
                            </span>
                            {item.label}
                            <ChevronRight className='ml-auto h-4 w-4 text-slate-300' />
                          </button>
                        );
                      })}
                  </div>
                  <div className='border-t border-slate-100 p-1'>
                    {profileMenuData
                      .filter((i) => !i.navigation)
                      .map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.path}
                            type='button'
                            role='menuitem'
                            onClick={() => {
                              setShowProfile(false);
                              setConfirmLogout(true);
                            }}
                            className='ui-menu-item text-[var(--color-status-down)] hover:bg-red-50 hover:text-[var(--color-status-down)]'>
                            <span className='flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-red-50'>
                              <Icon className='h-4 w-4' />
                            </span>
                            {item.label}
                          </button>
                        );
                      })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </header>

      <ConfirmActionDialog
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        onConfirm={handleLogoutConfirm}
        variant='warning'
        title='Log out?'
        message='You will need to sign in again to continue.'
        confirmLabel='Log out'
      />
    </>
  );
};
