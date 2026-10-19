'use client';

import Link from 'next/link';
import { CheckCircle2, Database, XCircle } from 'lucide-react';
import PageWrapper from '@/components/layout/pageWrapper';
import { Panel } from '@/components/activity/Panel';
import { useGetWakaConfigQuery } from '@/redux/slice/wakatime';

/** "0 21 * * *" → "every day at 21:00"; "*\/10 * * * *" → "every 10 minutes" */
const cronText = (cron: string) => {
  if (!cron) return 'off';
  const [m, h, , , dow] = cron.split(' ');
  if (m.startsWith('*/') && h === '*') return `every ${m.slice(2)} minutes`;
  if (/^\d+$/.test(m) && /^\d+$/.test(h)) return `${dow === '*' ? 'every day' : `weekday ${dow}`} at ${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
  return cron;
};

const Row = ({ label, value, ok }: { label: string; value: React.ReactNode; ok?: boolean }) => (
  <div className="grid grid-cols-[1fr_auto] gap-x-4 border-b border-slate-100 py-2.5 last:border-0">
    <span className="text-[13px] text-slate-700">{label}</span>
    <span className="flex items-center gap-1.5 text-right text-[13px] font-semibold text-slate-900">
      {ok === true && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
      {ok === false && <XCircle className="h-4 w-4 text-rose-600" />}
      {value}
    </span>
  </div>
);

/** How WakaTime data is collected — read-only server settings. */
export default function DataCollectionPage() {
  const { data, refetch } = useGetWakaConfigQuery();
  const c = data?.data;

  return (
    <PageWrapper title="Data Collection" subtitle="How and when WakaTime data is collected" titleIcon={<Database />} showRefreshButton onRefresh={refetch} noCard>
      {c && (
        <div className="grid gap-3 xl:grid-cols-2">
          <Panel title="Schedule">
            <Row label="Nightly collection" value={c.syncEnabled ? cronText(c.syncCron) : 'off on this server'} ok={c.syncEnabled} />
            <Row label="Days collected each night" value={`today + ${c.lookbackDays} previous`} />
            <Row label="“Working now” refresh" value={cronText(c.liveCron)} ok={Boolean(c.liveCron)} />
            <Row label="Counts as working now" value={`activity within ${c.activeMinutes} min`} />
            <Row label="Time zone" value={c.timezone} />
            <p className="mt-3 text-[12.5px] text-slate-500">
              Run it now or see past runs on <Link href="/data-sync" className="font-semibold underline">Data Sync</Link>.
            </p>
          </Panel>
          <Panel title="What is collected">
            <Row label="Branches & files per project" value={c.fetchProjectDetails ? 'yes' : 'no'} ok={c.fetchProjectDetails} />
            <Row label="Commit messages" value={c.fetchCommits ? 'yes (linked repositories)' : 'no'} ok={c.fetchCommits} />
            <Row label="Timelines" value={c.durationSlices.join(', ')} />
            <Row label="Gap between WakaTime calls" value={`${c.apiMinIntervalMs} ms`} />
            <Row label="Token encryption" value={c.tokenSecretConfigured ? 'on' : 'not set up — tokens cannot be saved'} ok={c.tokenSecretConfigured} />
            <p className="mt-3 text-[12.5px] leading-relaxed text-slate-500">
              These are server settings — ask your system administrator to change them.
            </p>
          </Panel>
        </div>
      )}
    </PageWrapper>
  );
}
