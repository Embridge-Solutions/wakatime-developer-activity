'use client';

import TopMenu from '@/components/layout/TopMenu';
import { settingsTabs } from '@/config/data-config';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <TopMenu items={settingsTabs}>{children}</TopMenu>;
}
