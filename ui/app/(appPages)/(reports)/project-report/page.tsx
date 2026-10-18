'use client';

import { useState } from 'react';
import { FolderGit2 } from 'lucide-react';
import PageWrapper from '@/components/layout/pageWrapper';
import Table, { TableColumn } from '@/components/table';
import ActivityFilterBar from '@/components/activity/ActivityFilterBar';
import { Notice } from '@/components/activity/Panel';
import { useActivityFilters } from '@/components/activity/useActivityFilters';
import { hasScope } from '@/utils/auth-store';
import { fmtDuration, fmtNumber, fmtPct, fmtUsd } from '@/components/activity/format';
import { BreakdownRow, Dimension, useGetActivityBreakdownQuery } from '@/redux/slice/activity';

type Row = BreakdownRow & { rowKey: string; aiLinesTotal: number; humanLinesTotal: number };

const toRows = (data?: BreakdownRow[]): Row[] =>
  (data ?? []).map((r) => ({
    ...r,
    rowKey: `${r.projectName}/${r.itemName}`,
    aiLinesTotal: r.aiAdditions + r.aiDeletions,
    humanLinesTotal: r.humanAdditions + r.humanDeletions,
  }));

const columns = (nameLabel: string, withProject: boolean): TableColumn<Row>[] => [
  { key: 'rowKey', label: 'Key', display: 'excluded' },
  { key: 'itemName', label: nameLabel },
  ...(withProject ? [{ key: 'projectName' as keyof Row, label: 'Project' }] : []),
  { key: 'hours', label: 'Coding Time', render: (_v, r) => fmtDuration(r.totalSeconds) },
  { key: 'pct', label: '% of Time', render: (v) => fmtPct(v) },
  { key: 'developerCount', label: 'Developers' },
  { key: 'dayCount', label: 'Days' },
  { key: 'humanLinesTotal', label: 'Human Lines', render: (v) => fmtNumber(v) },
  { key: 'aiLinesTotal', label: 'AI Lines', render: (v) => fmtNumber(v) },
  { key: 'aiLinePct', label: 'AI %', render: (v) => fmtPct(v) },
  { key: 'aiCostUsd', label: 'AI Cost (USD)', render: (v) => fmtUsd(v) },
];

/** Projects, then the branches and files of the selected project (branch names map to tickets later). */
export default function ProjectReportPage() {
  const { filters, ready, notLinked } = useActivityFilters();
  const canExport = hasScope('report_export');
  const skip = !ready || notLinked;
  const [project, setProject] = useState('');
  const [level, setLevel] = useState<Extract<Dimension, 'branch' | 'entity'>>('branch');

  const projects = useGetActivityBreakdownQuery({ ...filters, dimension: 'project', top: 500 }, { skip });
  const detail = useGetActivityBreakdownQuery(
    { ...filters, dimension: level, projectName: project || undefined, top: 500 },
    { skip },
  );

  return (
    <PageWrapper
      title="Projects & Branches"
      subtitle="Time and AI usage per project, branch and file"
      titleIcon={<FolderGit2 />}
      showRefreshButton
      onRefresh={() => Promise.all([projects.refetch(), detail.refetch()])}
      noCard
    >
      <ActivityFilterBar />
      {notLinked ? (
        <Notice title="Your login is not tracked in WakaTime yet" tone="warning">Ask an admin to turn on WakaTime tracking for your user.</Notice>
      ) : (
        <div className="space-y-4">
          <Table<Row>
            data={toRows(projects.data?.data)}
            columns={columns('Project', false)}
            rowIdKey="rowKey"
            title="Project Report"
            subtitle={`${filters.fromDate} to ${filters.toDate}`}
            fileName={`Projects_${filters.fromDate}_${filters.toDate}`}
            showSearch
            showExport={canExport}
            showPrint={canExport}
            showPagination
            pageSize={10}
            showEditButton={false}
            showDeleteButton={false}
            rowActions={(row) => (
              <button
                type="button"
                className="ui-btn ui-btn-secondary ui-btn-sm"
                data-tone={project === row.itemName ? 'brand' : undefined}
                onClick={() => setProject((cur) => (cur === row.itemName ? '' : row.itemName))}
              >
                {project === row.itemName ? 'Selected' : 'Branches & files'}
              </button>
            )}
          />

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5" role="group" aria-label="Detail level">
              {(['branch', 'entity'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLevel(l)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold cursor-pointer ${level === l ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                >
                  {l === 'branch' ? 'Branches' : 'Files'}
                </button>
              ))}
            </div>
            <span className="text-[13px] text-slate-600">
              {project ? (
                <>
                  of <strong>{project}</strong>{' '}
                  <button type="button" className="ml-1 text-xs font-semibold text-slate-500 underline cursor-pointer" onClick={() => setProject('')}>
                    show all projects
                  </button>
                </>
              ) : (
                'of every project'
              )}
            </span>
          </div>

          <Table<Row>
            data={toRows(detail.data?.data)}
            columns={columns(level === 'branch' ? 'Branch' : 'File', true)}
            rowIdKey="rowKey"
            title={level === 'branch' ? 'Branch Report' : 'File Report'}
            subtitle={`${project || 'All projects'} · ${filters.fromDate} to ${filters.toDate}`}
            fileName={`${level === 'branch' ? 'Branches' : 'Files'}_${project || 'All'}_${filters.fromDate}_${filters.toDate}`}
            showSearch
            showExport={canExport}
            showPrint={canExport}
            showPagination
            pageSize={15}
            showActionsColumn={false}
          />
        </div>
      )}
    </PageWrapper>
  );
}
