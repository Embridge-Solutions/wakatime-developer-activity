'use client';

import { useState } from 'react';
import { History } from 'lucide-react';
import PageWrapper from '@/components/layout/pageWrapper';
import Table, { TableColumn } from '@/components/table';
import { fmtDateTime } from '@/components/activity/format';
import { MailLog, useGetMailLogsQuery } from '@/redux/slice/mail';

const TYPE: Record<string, string> = {
  weeklyDeveloper: 'Weekly — developer',
  weeklyTeam: 'Weekly — team',
  welcome: 'Welcome',
  test: 'Test',
};
const TONE: Record<MailLog['mailStatus'], string> = { SENT: 'success', FAILED: 'danger', SENDING: 'warning', SKIPPED: 'neutral' };

/** Every mail the app sent, failed or skipped. */
export default function MailHistoryPage() {
  const [mailType, setMailType] = useState('');
  const { data, refetch } = useGetMailLogsQuery({ top: 500, mailType: mailType || undefined });

  const columns: TableColumn<MailLog>[] = [
    { key: 'id', label: 'Id', display: 'excluded' },
    { key: 'createdDate', label: 'When', render: (v) => fmtDateTime(v) },
    { key: 'mailType', label: 'Mail', render: (v) => TYPE[v] ?? v },
    {
      key: 'recipientEmail',
      label: 'To',
      render: (v, r) => (
        <div>
          <p className="font-medium text-slate-900">{v}</p>
          {r.recipientName && <p className="text-[11.5px] text-slate-500">{r.recipientName}</p>}
        </div>
      ),
    },
    { key: 'subject', label: 'Subject' },
    { key: 'mailStatus', label: 'Status', render: (v: MailLog['mailStatus']) => <span className="ui-pill" data-tone={TONE[v]}>{v.toLowerCase()}</span> },
    { key: 'triggeredBy', label: 'By' },
    { key: 'errorMessage', label: 'Error' },
  ];

  return (
    <PageWrapper title="Mail History" subtitle="Every mail sent, failed or skipped" titleIcon={<History />} showRefreshButton onRefresh={refetch} noCard>
      <div className="mb-3">
        <select aria-label="Mail type" className="ui-select h-9 min-w-[200px] text-sm" value={mailType} onChange={(e) => setMailType(e.target.value)}>
          <option value="">All mails</option>
          {Object.entries(TYPE).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      <Table<MailLog>
        data={data?.data ?? []}
        columns={columns}
        rowIdKey="id"
        title="Mail History"
        fileName="Mail_History"
        showSearch
        showExport
        showPagination
        pageSize={20}
        showActionsColumn={false}
      />
    </PageWrapper>
  );
}
