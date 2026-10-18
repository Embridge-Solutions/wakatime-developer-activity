'use client';

import { useState } from 'react';
import { Wrench } from 'lucide-react';
import PageWrapper from '@/components/layout/pageWrapper';
import Table, { TableColumn } from '@/components/table';
import ActivityFilterBar from '@/components/activity/ActivityFilterBar';
import { Notice } from '@/components/activity/Panel';
import { useActivityFilters } from '@/components/activity/useActivityFilters';
import { hasScope } from '@/utils/auth-store';
import { fmtDuration, fmtNumber, fmtPct } from '@/components/activity/format';
import { BreakdownRow, Dimension, useGetActivityBreakdownQuery } from '@/redux/slice/activity';

const DIMENSIONS: { id: Dimension; label: string }[] = [
  { id: 'language', label: 'Languages' },
  { id: 'editor', label: 'Editors & AI tools' },
  { id: 'category', label: 'Activity types' },
  { id: 'operating_system', label: 'Operating systems' },
  { id: 'machine', label: 'Machines' },
  { id: 'dependency', label: 'Dependencies' },
];

type Row = BreakdownRow & { aiLinesTotal: number; humanLinesTotal: number };

/** Time per language, editor, activity type, OS, machine or dependency. */
export default function ToolsReportPage() {
  const { filters, ready, notLinked } = useActivityFilters();
  const canExport = hasScope('report_export');
  const [dimension, setDimension] = useState<Dimension>('language');
  const label = DIMENSIONS.find((d) => d.id === dimension)!.label;
  const { data, refetch } = useGetActivityBreakdownQuery({ ...filters, dimension, top: 500 }, { skip: !ready || notLinked });

  const rows: Row[] = (data?.data ?? []).map((r) => ({
    ...r,
    aiLinesTotal: r.aiAdditions + r.aiDeletions,
    humanLinesTotal: r.humanAdditions + r.humanDeletions,
  }));
  const withAi = dimension === 'editor';

  const columns: TableColumn<Row>[] = [
    { key: 'itemName', label: label.replace(/s$/, '').replace(/s & AI tool$/, ' / AI tool') },
    { key: 'hours', label: 'Coding Time', render: (_v, r) => fmtDuration(r.totalSeconds) },
    { key: 'pct', label: '% of Time', render: (v) => fmtPct(v) },
    { key: 'developerCount', label: 'Developers' },
    { key: 'dayCount', label: 'Days' },
    ...(withAi
      ? ([
          { key: 'humanLinesTotal', label: 'Human Lines', render: (v: number) => fmtNumber(v) },
          { key: 'aiLinesTotal', label: 'AI Lines', render: (v: number) => fmtNumber(v) },
          { key: 'aiLinePct', label: 'AI %', render: (v: number | null) => fmtPct(v) },
        ] as TableColumn<Row>[])
      : []),
  ];

  return (
    <PageWrapper title="Languages & Tools" subtitle="Where the time goes" titleIcon={<Wrench />} showRefreshButton onRefresh={refetch} noCard>
      <ActivityFilterBar
        extra={
          <select aria-label="Report on" className="ui-select h-9 min-w-[180px] text-sm" value={dimension} onChange={(e) => setDimension(e.target.value as Dimension)}>
            {DIMENSIONS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        }
      />
      {notLinked ? (
        <Notice title="Your login is not tracked in WakaTime yet" tone="warning">Ask an admin to turn on WakaTime tracking for your user.</Notice>
      ) : (
        <Table<Row>
          data={rows}
          columns={columns}
          rowIdKey="itemName"
          title={`${label} Report`}
          subtitle={`${filters.fromDate} to ${filters.toDate}`}
          fileName={`${label.replace(/[^A-Za-z]+/g, '_')}_${filters.fromDate}_${filters.toDate}`}
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
