'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Info, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useScopes } from '@/hooks/useScopes';
import { MenuItem } from '@/utils/types';

interface TopMenuProps {
  /** Tabs from config/data-config.ts (dashboardTabs, reportTabs, …) */
  items: MenuItem[];
  /** Small hint on the right of the menu (hidden on small screens). */
  note?: string;
  /**
   * Hide tabs whose `access` page isn't in the user's role. Off by default —
   * like the original menus, every tab is shown and the pages guard themselves.
   */
  checkAccess?: boolean;
  /** Page content shown under the menu. */
  children?: React.ReactNode;
}

/**
 * Segmented tab menu above a group of related pages (dashboards, reports).
 * Shows every tab by default; pass `checkAccess` to hide tabs the user's
 * role has no page permission for.
 */
const TopMenu = ({ items, note, checkAccess = false, children }: TopMenuProps) => {
  const pathname = usePathname();
  const { canAccess, ready } = useScopes();

  const tabs = useMemo(
    () => (checkAccess ? items.filter((t) => !t.access || !ready || canAccess(t.access)) : items),
    [items, checkAccess, ready, canAccess],
  );

  return (
    <div className="relative flex h-full flex-col">
      <nav
        aria-label="Section menu"
        className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xs"
      >
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none]">
          {tabs.map((tab) => {
            const active = pathname === tab.path || !!tab.subPaths?.includes(pathname);
            const Icon = tab.icon ?? LayoutDashboard;
            return (
              <Link
                key={tab.path}
                href={tab.path}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group flex shrink-0 items-center gap-2.5 rounded-lg py-1.5 pl-1.5 pr-3.5 text-sm font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                  active ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                )}
              >
                <span
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                    active
                      ? 'bg-theme-primary text-[var(--theme-active-text)]'
                      : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-slate-700',
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="whitespace-nowrap">{tab.label}</span>
              </Link>
            );
          })}
        </div>

        {note && (
          <span className="hidden shrink-0 items-center gap-1.5 pr-2 text-xs text-slate-500 lg:flex">
            <Info className="h-3.5 w-3.5 text-slate-400" />
            {note}
          </span>
        )}
      </nav>

      <div className="mt-4">{children}</div>
    </div>
  );
};

export default TopMenu;
