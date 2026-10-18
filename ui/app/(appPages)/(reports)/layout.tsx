'use client';

import TopMenu from '@/components/layout/TopMenu';
import { reportTabs } from '@/config/data-config';

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return (
    <TopMenu items={reportTabs} note="Every report exports to Excel, CSV and PDF">
      {children}
    </TopMenu>
  );
}
