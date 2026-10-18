'use client';

import { useEffect, useMemo, useState } from 'react';
import { format, subDays } from 'date-fns';
import { CheckCircle2, Loader2, Play, RefreshCcw, ShieldCheck, XCircle } from 'lucide-react';
import PageWrapper from '@/components/layout/pageWrapper';
import Table, { TableColumn } from '@/components/table';
import { showAlert } from '@/components/common/AlertHandler';
import { Panel } from '@/components/activity/Panel';
import { fmtDateTime, fmtDay } from '@/components/activity/format';
import { useGetDevelopersQuery } from '@/redux/slice/developer';
import { hasScope } from '@/utils/auth-store';
import {
  SyncLog,
  SyncNowInput,
  SyncRun,
  useGetSyncLogsQuery,
  useGetSyncRunsQuery,
  useGetSyncStatusQuery,
  useSyncNowMutation,
} from '@/redux/slice/wakatime';

type Mode = 'nightly' | 'date' | 'days';

const RUN_TONE: Record<SyncRun['runStatus'], string> = { RUNNING: 'warning', COMPLETED: 'success', FAILED: 'danger' };
const LOG_TONE: Record<SyncLog['syncStatus'], string> = { SUCCESS: 'success', FAILED: 'danger', AUTH_ERROR: 'danger' };

const seconds = (s: number) => (s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`);

/**
 * Manual WakaTime collection (the same job as the nightly run) + run history.
 * Only one run at a time across every API server, and each developer-day is
 * replaced on re-run — running it again never duplicates data.
 */
export default function DataSyncPage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [mode, setMode] = useState<Mode>('nightly');
  const [date, setDate] = useState(format(subDays(new Date(), 1), 'yyyy-MM-dd'));
  const [days, setDays] = useState(7);
  const [developerId, setDeveloperId] = useState<string>('');
  const [selectedRun, setSelectedRun] = useState<string>('');

  const { data: devData } = useGetDevelopersQuery({ status: 'ACTIVE' });
  const [syncNow, { isLoading: starting }] = useSyncNowMutation();
  const canRun = hasScope('sync_run');

  const [polling, setPolling] = useState(false);
  const status = useGetSyncStatusQuery(undefined, { pollingInterval: polling ? 2500 : 0 });
  const running = Boolean(status.data?.data?.running);
  const runs = useGetSyncRunsQuery({ top: 50 }, { pollingInterval: polling ? 5000 : 0 });
  const runRows = useMemo(() => runs.data?.data ?? [], [runs.data]);
  const anyRunning = running || runRows.some((r) => r.runStatus === 'RUNNING');

  // Keep polling while something is running; one last refresh when it ends
  useEffect(() => {
    if (anyRunning) setPolling(true);
    else if (polling) {
      setPolling(false);
      runs.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anyRunning]);

  const runId = selectedRun || runRows[0]?.runId || '';
  const logs = useGetSyncLogsQuery({ runId, top: 500 }, { skip: !runId, pollingInterval: polling ? 5000 : 0 });

  const usable = (devData?.data ?? []).filter((d) => d.keyStatus !== 'NOT_SET');

  const start = async () => {
    const body: SyncNowInput = { developerId: developerId ? Number(developerId) : null };
    if (mode === 'date') body.date = date;
    if (mode === 'days') body.days = days;
    try {
      const res = await syncNow(body).unwrap();
      showAlert({ status: 'success', message: `${res.msg} — ${res.data.dates.length} day(s)` });
      setSelectedRun(res.data.runId);
      setPolling(true);
      status.refetch();
      runs.refetch();
    } catch (err: any) {
      showAlert({ status: 'error', message: err?.data?.msg ?? 'Could not start the sync' });
      runs.refetch();
    }
  };

  const runColumns: TableColumn<SyncRun>[] = [
    { key: 'runId', label: 'Run', display: 'excluded' },
    { key: 'startedDate', label: 'Started', render: (v) => fmtDateTime(v) },
    { key: 'triggeredBy', label: 'Triggered By' },
    { key: 'activityDates', label: 'Days', render: (v: string) => v.split(',').map((d) => fmtDay(d)).join(', ') },
    { key: 'developerName', label: 'Developer', render: (v) => v || 'Everyone' },
    {
      key: 'runStatus',
      label: 'Status',
      render: (v: SyncRun['runStatus']) => (
        <span className="ui-pill" data-tone={RUN_TONE[v]} data-live={v === 'RUNNING' ? 'true' : undefined}>
          {v.toLowerCase()}
        </span>
      ),
    },
    { key: 'okCount', label: 'OK', render: (v, r) => (r.runStatus === 'RUNNING' ? '…' : v ?? 0) },
    { key: 'failedCount', label: 'Failed', render: (v, r) => (r.runStatus === 'RUNNING' ? '…' : v ?? 0) },
    { key: 'durationSeconds', label: 'Duration', render: (v) => seconds(v) },
    { key: 'errorMessage', label: 'Error' },
  ];

  const logColumns: TableColumn<SyncLog>[] = [
    { key: 'id', label: 'Id', display: 'excluded' },
    { key: 'developerName', label: 'Developer' },
    { key: 'activityDate', label: 'Day', render: (v) => fmtDay(v, true) },
    {
      key: 'syncStatus',
      label: 'Result',
      render: (v: SyncLog['syncStatus']) => (
        <span className="ui-pill" data-tone={LOG_TONE[v]}>
          {v === 'AUTH_ERROR' ? 'token rejected' : v.toLowerCase()}
        </span>
      ),
    },
    { key: 'codingHours', label: 'Coding Hours' },
    { key: 'heartbeatCount', label: 'Heartbeats' },
    { key: 'apiCalls', label: 'API Calls' },
    { key: 'errorMessage', label: 'Error' },
  ];

  const last = status.data?.data?.lastRun;

  return (
    <PageWrapper
      title="Data Sync"
      subtitle="Collect WakaTime data now — the same job that runs every night"
      titleIcon={<RefreshCcw />}
      showRefreshButton
      onRefresh={() => Promise.all([status.refetch(), runs.refetch(), runId ? logs.refetch() : null])}
      noCard
    >
      <div className="grid gap-3 xl:grid-cols-3">
        <Panel title="Run collection now" className="xl:col-span-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="ui-field">
              <label htmlFor="syncDeveloper" className="ui-label">Developers</label>
              <select id="syncDeveloper" className="ui-select" value={developerId} onChange={(e) => setDeveloperId(e.target.value)}>
                <option value="">Every active developer with a token</option>
                {usable.map((d) => (
                  <option key={d.developerId} value={d.developerId}>
                    {d.developerName}
                    {d.keyStatus === 'INVALID' ? ' (token rejected — skipped)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <fieldset className="ui-field">
              <legend className="ui-label">Days to collect</legend>
              <div className="space-y-2 text-sm text-slate-700">
                <label className="flex items-center gap-2">
                  <input type="radio" name="mode" checked={mode === 'nightly'} onChange={() => setMode('nightly')} />
                  Today + yesterday <span className="text-slate-400">(same as the nightly run)</span>
                </label>
                <label className="flex flex-wrap items-center gap-2">
                  <input type="radio" name="mode" checked={mode === 'date'} onChange={() => setMode('date')} />
                  One day
                  <input
                    type="date"
                    className="ui-input h-8 w-[150px]"
                    value={date}
                    max={today}
                    onChange={(e) => {
                      setDate(e.target.value);
                      setMode('date');
                    }}
                  />
                </label>
                <label className="flex flex-wrap items-center gap-2">
                  <input type="radio" name="mode" checked={mode === 'days'} onChange={() => setMode('days')} />
                  Last
                  <input
                    type="number"
                    min={1}
                    max={14}
                    className="ui-input h-8 w-[70px]"
                    value={days}
                    onChange={(e) => {
                      setDays(Math.min(14, Math.max(1, Number(e.target.value) || 1)));
                      setMode('days');
                    }}
                  />
                  days + today <span className="text-slate-400">(backfill, max 14)</span>
                </label>
              </div>
            </fieldset>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
            <button type="button" className="ui-btn ui-btn-primary" onClick={start} disabled={!canRun || starting || anyRunning} title={canRun ? undefined : 'Needs the sync_run scope'}>
              {starting || anyRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {anyRunning ? 'Sync running…' : 'Run sync now'}
            </button>
            {anyRunning && (
              <span className="text-[13px] text-slate-600">
                Started {status.data?.data?.startedAt ? fmtDateTime(format(new Date(status.data.data.startedAt), "yyyy-MM-dd'T'HH:mm:ss")) : ''}{' '}
                by {status.data?.data?.triggeredBy ?? runRows.find((r) => r.runStatus === 'RUNNING')?.triggeredBy ?? '—'} — results appear below as each
                developer finishes.
              </span>
            )}
            {!anyRunning && last && (
              <span className="flex items-center gap-1.5 text-[13px] text-slate-600">
                {last.failed ? <XCircle className="h-4 w-4 text-rose-600" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                Last run on this server: {last.ok} ok, {last.failed} failed, {last.developers} developer(s)
              </span>
            )}
          </div>
        </Panel>

        <Panel title="No duplicates" right={<ShieldCheck className="h-4 w-4 text-emerald-600" />}>
          <ul className="space-y-2 text-[13px] leading-relaxed text-slate-600">
            <li>· Only one sync runs at a time — on every server. A second click waits for the first run.</li>
            <li>· Each developer-day is replaced in one transaction, so running a day again updates it and never adds a copy.</li>
            <li>· Nightly at 9 PM IST the job collects today and yesterday, so late-evening work is picked up the next night.</li>
            <li>· A rejected token is skipped until a new one is saved on WakaTime Tokens.</li>
          </ul>
        </Panel>
      </div>

      <div className="mt-3 space-y-3">
        <Table<SyncRun>
          data={runRows}
          columns={runColumns}
          rowIdKey="runId"
          title="Sync Runs"
          fileName="Sync_Runs"
          showSearch
          showExport
          showPagination
          pageSize={8}
          showEditButton={false}
          showDeleteButton={false}
          rowActions={(r) => (
            <button
              type="button"
              className="ui-btn ui-btn-secondary ui-btn-sm"
              data-tone={r.runId === runId ? 'brand' : undefined}
              onClick={() => setSelectedRun(r.runId)}
            >
              {r.runId === runId ? 'Showing' : 'Details'}
            </button>
          )}
        />

        <Table<SyncLog>
          data={logs.data?.data ?? []}
          columns={logColumns}
          rowIdKey="id"
          title="Run Details"
          subtitle={runId ? `Run ${runId.slice(0, 8)}…` : 'No run selected'}
          fileName={`Sync_Run_${runId.slice(0, 8)}`}
          showSearch
          showExport
          showPagination
          pageSize={15}
          showActionsColumn={false}
        />
      </div>
    </PageWrapper>
  );
}
