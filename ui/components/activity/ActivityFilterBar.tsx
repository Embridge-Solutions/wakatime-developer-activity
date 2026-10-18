'use client';

import { useMemo } from 'react';
import { format, startOfMonth, subDays } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppDispatch } from '@/redux/hooks';
import { RangePreset, resetActivityFilter, setActivityFilter } from '@/redux/slice/filterSlice';
import { useGetDevelopersQuery } from '@/redux/slice/developer';
import { useGetTeamsQuery } from '@/redux/slice/team';
import { DateRangePicker } from '@/components/dateselector/DateRangePicker';
import { developerColor } from './palette';
import { useActivityFilters } from './useActivityFilters';

const PRESETS: { id: RangePreset; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 days' },
  { id: '14d', label: '14 days' },
  { id: '30d', label: '30 days' },
  { id: 'thisMonth', label: 'This month' },
];

const ymd = (d: Date) => format(d, 'yyyy-MM-dd');

const presetRange = (preset: RangePreset) => {
  const today = new Date();
  switch (preset) {
    case 'today':
      return { fromDate: ymd(today), toDate: ymd(today) };
    case '14d':
      return { fromDate: ymd(subDays(today, 13)), toDate: ymd(today) };
    case '30d':
      return { fromDate: ymd(subDays(today, 29)), toDate: ymd(today) };
    case 'thisMonth':
      return { fromDate: ymd(startOfMonth(today)), toDate: ymd(today) };
    default:
      return { fromDate: ymd(subDays(today, 6)), toDate: ymd(today) };
  }
};

/**
 * One row of filters above every dashboard and report: date range (presets or
 * custom), developer and team. Developer and team are shown only with
 * activity_viewall; everyone else always sees their own activity.
 */
export default function ActivityFilterBar({
  showDeveloper = true,
  showTeam = true,
  requireDeveloper = false,
  extra,
}: {
  showDeveloper?: boolean;
  showTeam?: boolean;
  /** Developer dashboard: no "All developers" option. */
  requireDeveloper?: boolean;
  extra?: React.ReactNode;
}) {
  const dispatch = useAppDispatch();
  const { raw, isAdmin, scope } = useActivityFilters();
  const { data: devData } = useGetDevelopersQuery(undefined, { skip: !isAdmin });
  const { data: teamData } = useGetTeamsQuery({ activeOnly: true }, { skip: !isAdmin });
  const developers = useMemo(() => devData?.data ?? [], [devData]);
  const teams = teamData?.data ?? [];

  const onRange = (range: DateRange | undefined) => {
    if (!range?.from) return;
    dispatch(setActivityFilter({ preset: 'custom', fromDate: ymd(range.from), toDate: ymd(range.to ?? range.from) }));
  };

  return (
    <div className="no-print mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-xs">
      <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-0.5" role="group" aria-label="Date range">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => dispatch(setActivityFilter({ preset: p.id, ...presetRange(p.id) }))}
            className={cn(
              'rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer',
              raw.preset === p.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="w-[250px]">
        <DateRangePicker dateRange={{ from: raw.fromDate, to: raw.toDate }} setDateRange={onRange} />
      </div>

      {isAdmin && showDeveloper && (
        <label className="flex items-center gap-2">
          <span className="sr-only">Developer</span>
          {raw.developerId && (
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: developerColor(raw.developerId) }} />
          )}
          <select
            className="ui-select h-9 min-w-[190px] text-sm"
            value={raw.developerId ?? ''}
            onChange={(e) => dispatch(setActivityFilter({ developerId: e.target.value ? Number(e.target.value) : null }))}
          >
            {!requireDeveloper && <option value="">All developers</option>}
            {requireDeveloper && !raw.developerId && <option value="">Select a developer…</option>}
            {developers.map((d) => (
              <option key={d.developerId} value={d.developerId}>
                {d.developerName}
                {!d.isActive ? ' (inactive)' : ''}
              </option>
            ))}
          </select>
        </label>
      )}

      {isAdmin && showTeam && teams.length > 0 && (
        <select
          aria-label="Team"
          className="ui-select h-9 min-w-[150px] text-sm"
          value={raw.teamId ?? ''}
          onChange={(e) => dispatch(setActivityFilter({ teamId: e.target.value ? Number(e.target.value) : null }))}
        >
          <option value="">All teams</option>
          {teams.map((t) => (
            <option key={t.teamId} value={t.teamId}>
              {t.teamName}
            </option>
          ))}
        </select>
      )}

      {!isAdmin && scope?.developer && (
        <span className="ui-pill" data-tone="brand">
          {scope.developer.developerName}
        </span>
      )}

      {extra}

      <button
        type="button"
        onClick={() => dispatch(resetActivityFilter())}
        className="ml-auto ui-btn ui-btn-ghost ui-btn-sm"
        title="Reset filters"
      >
        <RotateCcw className="h-3.5 w-3.5" /> Reset
      </button>
    </div>
  );
}
