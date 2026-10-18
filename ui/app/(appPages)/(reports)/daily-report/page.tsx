'use client';

import { CalendarDays } from 'lucide-react';
import PageWrapper from '@/components/layout/pageWrapper';
import Table, { TableColumn } from '@/components/table';
import ActivityFilterBar from '@/components/activity/ActivityFilterBar';
import { Notice } from '@/components/activity/Panel';
import { useActivityFilters } from '@/components/activity/useActivityFilters';
import { hasScope } from '@/utils/auth-store';
import { fmtDay, fmtDuration, fmtNumber, fmtPct, fmtTime, fmtUsd } from '@/components/activity/format';
import { DailyRow, useGetActivityDailyQuery } from '@/redux/slice/activity';

type Row = DailyRow & { rowKey: string; hours: number; aiLinesTotal: number; humanLinesTotal: number };

/** One row per developer per day: hours, first / last activity, AI vs human, cost. */
export default function DailyReportPage() {
  const { filters, ready, notLinked } = useActivityFilters();
  const canExport = hasScope('report_export');
  const { data, isFetching, refetch } = useGetActivityDailyQuery(filters, { skip: !ready || notLinked });

  const rows: Row[] = (data?.data ?? []).map((r) => ({
    ...r,
    rowKey: `${r.activityDate}-${r.developerId}`,
    hours: r.codingHours,
    aiLinesTotal: r.aiAdditions + r.aiDeletions,
    humanLinesTotal: r.humanAdditions + r.humanDeletions,
  }));

  const columns: TableColumn<Row>[] = [
    { key: 'rowKey', label: 'Key', display: 'excluded' },
    { key: 'activityDate', label: 'Date', render: (v) => fmtDay(v, true) },
    { key: 'developerName', label: 'Developer' },
    { key: 'team', label: 'Team' },
    { key: 'hours', label: 'Coding Hours', render: (_v, r) => fmtDuration(r.totalSeconds) },
    { key: 'firstActivity', label: 'First Activity', render: (v) => fmtTime(v) },
    { key: 'lastActivity', label: 'Last Activity', render: (v) => fmtTime(v) },
    { key: 'topProject', label: 'Top Project' },
    { key: 'humanLinesTotal', label: 'Human Lines', render: (v) => fmtNumber(v) },
    { key: 'aiLinesTotal', label: 'AI Lines', render: (v) => fmtNumber(v) },
    { key: 'aiLinePct', label: 'AI %', render: (v) => fmtPct(v) },
    { key: 'aiCodingSeconds', label: 'AI Coding Time', render: (v) => fmtDuration(v) },
    { key: 'aiSessions', label: 'AI Sessions' },
    { key: 'aiCostUsd', label: 'AI Cost (USD)', render: (v) => fmtUsd(v) },
    { key: 'heartbeatCount', label: 'Heartbeats', render: (v) => fmtNumber(v) },
  ];

  return (
    <PageWrapper title="Daily Report" subtitle="Developer × day coding activity" titleIcon={<CalendarDays />} showRefreshButton onRefresh={refetch} noCard>
      <ActivityFilterBar />
      {notLinked ? (
        <Notice title="Your login is not tracked in WakaTime yet" tone="warning">Ask an admin to turn on WakaTime tracking for your user.</Notice>
      ) : (
        <Table<Row>
          data={rows}
          columns={columns}
          rowIdKey="rowKey"
          title="Daily Activity Report"
          subtitle={`${filters.fromDate} to ${filters.toDate}`}
          fileName={`Daily_Activity_${filters.fromDate}_${filters.toDate}`}
          showSearch
          showExport={canExport}
          showPrint={canExport}
          showPagination
          pageSize={25}
          showActionsColumn={false}
        />
      )}
      {isFetching && <p className="mt-2 text-xs text-slate-400">Loading…</p>}
    </PageWrapper>
  );
}
