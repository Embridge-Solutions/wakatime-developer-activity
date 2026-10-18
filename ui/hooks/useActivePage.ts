'use client';

import { usePathname } from 'next/navigation';
import { usePageTitleSafe } from '@/contexts/page-title-context';
import { menuItems, profileMenuData, reportTabs } from '@/config/data-config';
import { MenuItem } from '@/utils/types';

export interface ActivePage {
  /** Sidebar section the page belongs to (e.g. "Settings"), when it's a tab. */
  section?: string;
  /** Page name shown in the top bar. */
  title: string;
  icon?: MenuItem['icon'];
}

const matches = (pathname: string, item: Pick<MenuItem, 'path' | 'subPaths'>) =>
  [item.path, ...(item.subPaths ?? [])].some((p) => p && (pathname === p || pathname.startsWith(`${p}/`)));

const tabGroups = [reportTabs];

/** Turns "/daily-report" into "Daily Report". */
const prettify = (pathname: string) =>
  (pathname.split('/').filter(Boolean).pop() || 'Home')
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Name of the page the user is on, from the menus in config/data-config.ts.
 * Tabs show their section too ("Settings › Appearance"). Falls back to the
 * title a page sets with usePageTitle(), then to the URL.
 */
export function useActivePage(): ActivePage {
  const pathname = usePathname() || '/';
  const pageTitle = usePageTitleSafe();

  const sidebarItem = menuItems.find((m) => matches(pathname, m));

  for (const group of tabGroups) {
    const tab = group.find((t) => matches(pathname, t));
    if (tab) {
      const section = sidebarItem && sidebarItem.label.trim() !== tab.label.trim() ? sidebarItem.label.trim() : undefined;
      return { section, title: tab.label.trim(), icon: tab.icon ?? sidebarItem?.icon };
    }
  }

  if (sidebarItem) return { title: sidebarItem.label.trim(), icon: sidebarItem.icon };

  const profileItem = profileMenuData.find((m) => matches(pathname, m));
  if (profileItem) return { section: 'Profile', title: profileItem.label, icon: profileItem.icon };

  return { title: pageTitle || prettify(pathname) };
}
