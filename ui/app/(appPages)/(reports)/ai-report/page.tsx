'use client';

import { Bot } from 'lucide-react';
import PageWrapper from '@/components/layout/pageWrapper';
import Table, { TableColumn } from '@/components/table';
import ActivityFilterBar from '@/components/activity/ActivityFilterBar';
import { Notice } from '@/components/activity/Panel';
import { useActivityFilters } from '@/components/activity/useActivityFilters';
import { hasScope } from '@/utils/auth-store';
import { fmtDateTime, fmtDuration, fmtNumber, fmtPct, fmtUsd } from '@/components/activity/format';
import {
  AgentRow,
  AiModelRow,
  DeveloperActivity,
  useGetActivityAgentsQuery,
  useGetActivityAiModelsQuery,
  useGetActivityDevelopersQuery,
} from '@/redux/slice/activity';

type DevRow = DeveloperActivity & { aiLinesTotal: number; humanLinesTotal: number };
type ToolRow = AgentRow & { aiLinesTotal: number; humanLinesTotal: number; kind: string };

/** AI usage per developer, per AI tool (agent) and per model — lines, tokens, cost. */
export default function AiReportPage() {
  const { filters, ready, notLinked } = useActivityFilters();
  const canExport = hasScope('report_export');
  const skip = !ready || notLinked;
  const devs = useGetActivityDevelopersQuery(filters, { skip });
  const tools = useGetActivityAgentsQuery(filters, { skip });
  const models = useGetActivityAiModelsQuery(filters, { skip });

  const devRows: DevRow[] = (devs.data?.data ?? []).map((r) => ({
    ...r,
    aiLinesTotal: r.aiAdditions + r.aiDeletions,
    humanLinesTotal: r.humanAdditions + r.humanDeletions,
  }));
  const toolRows: ToolRow[] = (tools.data?.data ?? []).map((r) => ({
    ...r,
    aiLinesTotal: r.aiAdditions + r.aiDeletions,
    humanLinesTotal: r.humanAdditions + r.humanDeletions,
    kind: r.isAiTool ? 'AI tool' : 'Editor',
  }));
  const range = `${filters.fromDate} to ${filters.toDate}`;

  const devColumns: TableColumn<DevRow>[] = [
    { key: 'developerId', label: 'Id', display: 'excluded' },
    { key: 'developerName', label: 'Developer' },
    { key: 'team', label: 'Team' },
    { key: 'totalHours', label: 'Coding Time', render: (_v, r) => fmtDuration(r.totalSeconds) },
    { key: 'aiCodingSeconds', label: 'AI Coding Time', render: (v) => fmtDuration(v) },
    { key: 'humanLinesTotal', label: 'Human Lines', render: (v) => fmtNumber(v) },
    { key: 'aiLinesTotal', label: 'AI Lines', render: (v) => fmtNumber(v) },
    { key: 'aiLinePct', label: 'AI %', render: (v) => fmtPct(v) },
    { key: 'aiSessions', label: 'AI Sessions' },
    { key: 'aiInputTokens', label: 'Input Tokens', render: (v) => fmtNumber(v) },
    { key: 'aiOutputTokens', label: 'Output Tokens', render: (v) => fmtNumber(v) },
    { key: 'aiCostUsd', label: 'AI Cost (USD)', render: (v) => fmtUsd(v) },
  ];

  const toolColumns: TableColumn<ToolRow>[] = [
    { key: 'editor', label: 'Editor / AI Tool' },
    { key: 'kind', label: 'Type' },
    { key: 'hours', label: 'Time', render: (_v, r) => fmtDuration(r.totalSeconds) },
    { key: 'developerCount', label: 'Developers' },
    { key: 'humanLinesTotal', label: 'Human Lines', render: (v) => fmtNumber(v) },
    { key: 'aiLinesTotal', label: 'AI Lines', render: (v) => fmtNumber(v) },
    { key: 'aiLinePct', label: 'AI %', render: (v) => fmtPct(v) },
    { key: 'aiModels', label: 'AI Models' },
    { key: 'lastSeen', label: 'Last Seen', render: (v) => fmtDateTime(v) },
  ];

  const modelColumns: TableColumn<AiModelRow>[] = [
    { key: 'modelName', label: 'Model' },
    { key: 'lineChanges', label: 'Line Changes', render: (v) => fmtNumber(v) },
    { key: 'inputTokens', label: 'Input Tokens', render: (v) => fmtNumber(v) },
    { key: 'outputTokens', label: 'Output Tokens', render: (v) => fmtNumber(v) },
    { key: 'cachedInputTokens', label: 'Cached Input Tokens', render: (v) => fmtNumber(v) },
    { key: 'developerCount', label: 'Developers' },
    { key: 'dayCount', label: 'Days' },
    { key: 'costUsd', label: 'Cost (USD)', render: (v) => fmtUsd(v) },
  ];

  return (
    <PageWrapper
      title="AI Usage"
      subtitle="AI vs human code, AI tools and models"
      titleIcon={<Bot />}
      showRefreshButton
      onRefresh={() => Promise.all([devs.refetch(), tools.refetch(), models.refetch()])}
      noCard
    >
      <ActivityFilterBar />
      {notLinked ? (
        <Notice title="Your login is not tracked in WakaTime yet" tone="warning">Ask an admin to turn on WakaTime tracking for your user.</Notice>
      ) : (
        <div className="space-y-4">
          <Table<DevRow> data={devRows} columns={devColumns} rowIdKey="developerId" title="AI Usage by Developer" subtitle={range}
            fileName={`AI_by_Developer_${filters.fromDate}_${filters.toDate}`} showSearch showExport={canExport} showPrint={canExport} showPagination pageSize={15} showActionsColumn={false} />
          <Table<ToolRow> data={toolRows} columns={toolColumns} rowIdKey="editor" title="Editors & AI Tools (Agents)" subtitle={range}
            fileName={`AI_Tools_${filters.fromDate}_${filters.toDate}`} showSearch showExport={canExport} showPrint={canExport} showPagination pageSize={10} showActionsColumn={false} />
          <Table<AiModelRow> data={models.data?.data ?? []} columns={modelColumns} rowIdKey="modelName" title="AI Models" subtitle={range}
            fileName={`AI_Models_${filters.fromDate}_${filters.toDate}`} showSearch showExport={canExport} showPrint={canExport} showPagination pageSize={10} showActionsColumn={false} />
        </div>
      )}
    </PageWrapper>
  );
}
