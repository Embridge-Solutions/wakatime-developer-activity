'use client';

import { Radio } from 'lucide-react';
import { Panel } from './Panel';
import { developerColor } from './palette';
import { fmtDuration, fmtTime } from './format';
import { useActivityFilters } from './useActivityFilters';
import { useGetActivityLiveQuery } from '@/redux/slice/activity';

/** "x min ago" / "3 h ago" / "2 d ago" */
const ago = (minutes: number | null) =>
  minutes === null ? 'no activity yet' : minutes < 1 ? 'just now' : minutes < 60 ? `${minutes} min ago` : minutes < 1440 ? `${Math.floor(minutes / 60)} h ago` : `${Math.floor(minutes / 1440)} d ago`;

/**
 * Who is working now (WakaTime activity within the last few minutes) and on which
 * project. Refreshed by the API's live job every 10 minutes; this panel re-reads every minute.
 */
export default function LivePanel({ projectName, className }: { projectName?: string; className?: string }) {
  const { filters, ready, notLinked, scope } = useActivityFilters();
  const { data } = useGetActivityLiveQuery(
    { developerId: filters.developerId, teamId: filters.teamId },
    { skip: !ready || notLinked, pollingInterval: 60_000 },
  );
  const rows = (data?.data ?? []).filter((r) => !projectName || r.currentProject === projectName);
  const now = rows.filter((r) => r.isWorkingNow);
  const minutes = scope?.activeMinutes ?? 15;

  return (
    <Panel
      title={`Working now · ${now.length}`}
      hint={`Developers with WakaTime activity in the last ${minutes} minutes. Last activity is refreshed every 10 minutes.`}
      right={<Radio className={`h-4 w-4 ${now.length ? 'text-emerald-600' : 'text-slate-400'}`} />}
      className={className}
      bodyClassName="p-0"
    >
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-400">No developers to show.</p>
      ) : (
        <ul className="max-h-[320px] divide-y divide-slate-100 overflow-y-auto">
          {rows.map((r) => (
            <li key={r.developerId} className="flex items-center gap-3 px-4 py-2.5">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                {r.isWorkingNow && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />}
                <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${r.isWorkingNow ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              </span>
              <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: developerColor(r.developerId) }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-slate-900">{r.developerName}</p>
                <p className="truncate text-[11.5px] text-slate-500">
                  {r.currentProject || '—'}
                  {r.team ? ` · ${r.team}` : ''}
                </p>
              </div>
              <div className="shrink-0 text-right text-[11.5px] tabular-nums">
                <p className={r.isWorkingNow ? 'font-semibold text-emerald-700' : 'text-slate-500'}>
                  {r.isWorkingNow ? 'Working now' : ago(r.minutesAgo)}
                </p>
                <p className="text-slate-400">
                  {r.lastActivity ? fmtTime(r.lastActivity) : ''} · today {fmtDuration(r.todaySeconds)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
