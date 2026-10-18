'use client';

import { Users } from 'lucide-react';
import PageWrapper from '@/components/layout/pageWrapper';
import Table, { TableColumn } from '@/components/table';
import ActivityFilterBar from '@/components/activity/ActivityFilterBar';
import { Notice } from '@/components/activity/Panel';
import { useActivityFilters } from '@/components/activity/useActivityFilters';
import { hasScope } from '@/utils/auth-store';
import { fmtDateTime, fmtDay, fmtDuration, fmtNumber, fmtPct, fmtUsd } from '@/components/activity/format';
import { DeveloperActivity, useGetActivityDevelopersQuery } from '@/redux/slice/activity';

type Row = DeveloperActivity & { aiLinesTotal: number; humanLinesTotal: number; status: string };

/** One row per developer for the range — totals, averages, top items and AI usage. */
export default function DeveloperReportPage() {
  const { filters, ready, notLinked } = useActivityFilters();
  const canExport = hasScope('report_export');
  const { data, refetch } = useGetActivityDevelopersQuery(filters, { skip: !ready || notLinked });

  const rows: Row[] = (data?.data ?? []).map((r) => ({
    ...r,
    aiLinesTotal: r.aiAdditions + r.aiDeletions,
    humanLinesTotal: r.humanAdditions + r.humanDeletions,
    status: r.isDeleted ? 'Deleted' : r.isActive ? 'Active' : 'Inactive',
  }));

  const columns: TableColumn<Row>[] = [
    { key: 'developerId', label: 'Id', display: 'excluded' },
    { key: 'developerName', label: 'Developer' },
    { key: 'developerCode', label: 'Code' },
    { key: 'team', label: 'Team' },
    { key: 'status', label: 'Status' },
    { key: 'totalHours', label: 'Coding Time', render: (_v, r) => fmtDuration(r.totalSeconds) },
    { key: 'activeDays', label: 'Active Days' },
    { key: 'avgHoursPerActiveDay', label: 'Avg h / Active Day' },
    { key: 'dailyAverageHours', label: 'Daily Avg (h)' },
    { key: 'lastActiveDate', label: 'Last Active', render: (v) => fmtDay(v, true) },
    { key: 'topProject', label: 'Top Project' },
    { key: 'topLanguage', label: 'Top Language' },
    { key: 'topEditor', label: 'Top Editor' },
    { key: 'humanLinesTotal', label: 'Human Lines', render: (v) => fmtNumber(v) },
    { key: 'aiLinesTotal', label: 'AI Lines', render: (v) => fmtNumber(v) },
    { key: 'aiLinePct', label: 'AI %', render: (v) => fmtPct(v) },
    { key: 'aiCodingSeconds', label: 'AI Coding Time', render: (v) => fmtDuration(v) },
    { key: 'aiCostUsd', label: 'AI Cost (USD)', render: (v) => fmtUsd(v) },
    { key: 'lastSyncDate', label: 'Last Sync', render: (v, r) => (v ? `${fmtDateTime(v)} · ${r.lastSyncStatus}` : 'Never') },
  ];

  return (
    <PageWrapper title="Developer Summary" subtitle="Totals and averages per developer" titleIcon={<Users />} showRefreshButton onRefresh={refetch} noCard>
      <ActivityFilterBar />
      {notLinked ? (
        <Notice title="Your login is not tracked in WakaTime yet" tone="warning">Ask an admin to turn on WakaTime tracking for your user.</Notice>
      ) : (
        <Table<Row>
          data={rows}
          columns={columns}
          rowIdKey="developerId"
          title="Developer Summary Report"
          subtitle={`${filters.fromDate} to ${filters.toDate}`}
          fileName={`Developer_Summary_${filters.fromDate}_${filters.toDate}`}
          showSearch
          showExport={canExport}
          showPrint={canExport}
          showPagination
          pageSize={25}
          showActionsColumn={false}
        />
      )}
    </PageWrapper>
  );
}
