'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bot, Clock, Coins, GitBranch, Sparkles, UserCircle } from 'lucide-react';
import PageWrapper from '@/components/layout/pageWrapper';
import ActivityFilterBar from '@/components/activity/ActivityFilterBar';
import { Notice, Panel, StatTile } from '@/components/activity/Panel';
import { AiHumanChart, AiHumanSplit, BarList, DailyHoursChart, DayTimeline, HourlyHeatmap } from '@/components/activity/charts';
import { useActivityFilters } from '@/components/activity/useActivityFilters';
import { aiLines, fmtDateTime, fmtDay, fmtDuration, fmtPct, fmtTime, fmtUsd, humanLines } from '@/components/activity/format';
import { AI_COLOR, HUMAN_COLOR, developerColor, nameColor } from '@/components/activity/palette';
import { useAppDispatch } from '@/redux/hooks';
import { setActivityFilter } from '@/redux/slice/filterSlice';
import { useGetDevelopersQuery } from '@/redux/slice/developer';
import {
  useGetActivityAgentsQuery,
  useGetActivityBreakdownQuery,
  useGetActivityDailyQuery,
  useGetActivityDevelopersQuery,
  useGetActivityHourlyQuery,
  useGetActivitySummaryQuery,
  useGetActivityTimelineQuery,
} from '@/redux/slice/activity';

const KEY_TONE: Record<string, string> = { VALID: 'success', INVALID: 'danger', NOT_SET: 'neutral' };

/**
 * One developer's activity: KPIs, daily hours, a day timeline, AI vs human,
 * projects / branches / files, languages, editors and weekly rhythm.
 * Admins choose the developer; everyone else sees their own.
 */
export default function DeveloperDashboardPage() {
  const dispatch = useAppDispatch();
  const { filters, ready, notLinked, isAdmin } = useActivityFilters();
  const { data: devList } = useGetDevelopersQuery(undefined, { skip: !isAdmin });

  // Admin with no developer chosen yet → the first active developer
  useEffect(() => {
    if (isAdmin && !filters.developerId && devList?.data?.length) {
      const first = devList.data.find((d) => d.isActive) ?? devList.data[0];
      dispatch(setActivityFilter({ developerId: first.developerId }));
    }
  }, [isAdmin, filters.developerId, devList, dispatch]);

  const developerId = filters.developerId ?? null;
  const f = { ...filters, team: null };
  const skip = !ready || notLinked || !developerId;

  const info = useGetActivityDevelopersQuery(f, { skip });
  const summary = useGetActivitySummaryQuery(f, { skip });
  const daily = useGetActivityDailyQuery(f, { skip });
  const projects = useGetActivityBreakdownQuery({ ...f, dimension: 'project', top: 30 }, { skip });
  const languages = useGetActivityBreakdownQuery({ ...f, dimension: 'language', top: 30 }, { skip });
  const categories = useGetActivityBreakdownQuery({ ...f, dimension: 'category', top: 20 }, { skip });
  const agents = useGetActivityAgentsQuery(f, { skip });
  const hourly = useGetActivityHourlyQuery(f, { skip });

  const [project, setProject] = useState<string>('');
  const branches = useGetActivityBreakdownQuery({ ...f, dimension: 'branch', projectName: project || undefined, top: 30 }, { skip });
  const files = useGetActivityBreakdownQuery({ ...f, dimension: 'entity', projectName: project || undefined, top: 30 }, { skip });

  const dev = info.data?.data?.[0];
  const s = summary.data?.data;
  const dailyRows = useMemo(() => daily.data?.data ?? [], [daily.data]);

  // Timeline day: latest day with activity in the range
  const activeDays = useMemo(
    () => dailyRows.filter((r) => r.totalSeconds > 0).map((r) => r.activityDate).sort().reverse(),
    [dailyRows],
  );
  const [day, setDay] = useState<string>('');
  const timelineDay = day && activeDays.includes(day) ? day : activeDays[0] || '';
  const timeline = useGetActivityTimelineQuery(
    { developerId: developerId ?? 0, date: timelineDay },
    { skip: skip || !timelineDay },
  );
  const dayRow = dailyRows.find((r) => r.activityDate === timelineDay);

  const refreshAll = () =>
    Promise.all([info, summary, daily, projects, languages, categories, agents, hourly, branches, files].map((q) => q.refetch()));

  return (
    <PageWrapper
      title={isAdmin ? 'Developer Dashboard' : 'My Dashboard'}
      subtitle={isAdmin ? "One developer's coding activity, day by day" : 'Your coding activity, day by day'}
      titleIcon={<UserCircle />}
      showRefreshButton
      onRefresh={refreshAll}
      showPrintButton
      noCard
    >
      <ActivityFilterBar showTeam={false} requireDeveloper />

      {notLinked ? (
        <Notice title="Your login is not tracked in WakaTime yet" tone="warning">
          Ask an admin to turn on WakaTime tracking for your user.
        </Notice>
      ) : !developerId ? (
        <Notice title="Select a developer">Choose a developer in the filter above.</Notice>
      ) : (
        <div className="space-y-3">
          {/* Developer header */}
          <section className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-display text-lg font-bold text-white"
              style={{ backgroundColor: developerColor(developerId) }}
            >
              {(dev?.developerName || '?').slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-lg font-bold text-slate-900">{dev?.developerName ?? '…'}</p>
              <p className="truncate text-[12.5px] text-slate-500">
                {[dev?.developerCode, dev?.designation, dev?.team].filter(Boolean).join(' · ') || '—'}
              </p>
            </div>
            {dev && (
              <div className="flex flex-wrap items-center gap-2 text-[12px]">
                <span className="ui-pill" data-tone={dev.isActive ? 'success' : 'neutral'}>
                  {dev.isActive ? 'Collecting' : 'Inactive'}
                </span>
                <span className="ui-pill" data-tone={KEY_TONE[dev.keyStatus] ?? 'neutral'}>
                  Token {dev.keyStatus === 'NOT_SET' ? 'not set' : dev.keyStatus.toLowerCase()}
                </span>
                <span className="text-slate-500">Last sync {dev.lastSyncDate ? fmtDateTime(dev.lastSyncDate) : 'never'}</span>
              </div>
            )}
          </section>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <StatTile label="Coding time" icon={<Clock />} value={s ? fmtDuration(s.totalSeconds) : '—'} sub={dev ? `${dev.dailyAverageHours}h daily average` : undefined} />
            <StatTile label="Active days" icon={<Clock />} value={dev ? `${dev.activeDays} / ${s?.rangeDays ?? '—'}` : '—'} sub={dev?.avgHoursPerActiveDay != null ? `${dev.avgHoursPerActiveDay}h per active day` : undefined} />
            <StatTile label="Last activity" icon={<Clock />} value={dev?.lastActiveDate ? fmtDay(dev.lastActiveDate) : '—'} sub={dev?.lastActivity ? `at ${fmtTime(dev.lastActivity)}` : undefined} />
            <StatTile label="AI share of code" icon={<Sparkles />} tone={AI_COLOR} value={fmtPct(s?.aiLinePct)} sub="of line changes" />
            <StatTile label="AI coding time" icon={<Bot />} value={s ? fmtDuration(s.aiCodingSeconds) : '—'} sub={s?.aiCodingPct != null ? `${fmtPct(s.aiCodingPct)} of coding time` : undefined} />
            <StatTile label="AI cost (est.)" icon={<Coins />} value={fmtUsd(s?.aiCostUsd)} sub={s ? `${s.aiSessions} sessions · ${s.aiPromptEvents} prompts` : undefined} />
          </div>

          <div className="grid gap-3 xl:grid-cols-3">
            <Panel title="Daily coding hours" className="xl:col-span-2">
              <DailyHoursChart rows={dailyRows} fromDate={filters.fromDate} toDate={filters.toDate} />
            </Panel>
            <Panel title="AI vs human code">
              <AiHumanSplit ai={s ? aiLines(s) : 0} human={s ? humanLines(s) : 0} />
              <div className="mt-5 border-t border-slate-100 pt-4">
                <AiHumanChart rows={dailyRows} fromDate={filters.fromDate} toDate={filters.toDate} height={150} />
              </div>
            </Panel>
          </div>

          <Panel
            title="Day timeline"
            hint="Work blocks for one day (IST), coloured by project."
            right={
              <select
                aria-label="Day"
                className="ui-select h-8 text-[13px]"
                value={timelineDay}
                onChange={(e) => setDay(e.target.value)}
                disabled={!activeDays.length}
              >
                {!activeDays.length && <option value="">No active days</option>}
                {activeDays.map((d) => (
                  <option key={d} value={d}>
                    {fmtDay(d, true)}
                  </option>
                ))}
              </select>
            }
          >
            {dayRow && (
              <p className="mb-3 text-[12.5px] text-slate-600 tabular-nums">
                {fmtDuration(dayRow.totalSeconds)} coded · first activity {fmtTime(dayRow.firstActivity)} · last {fmtTime(dayRow.lastActivity)} ·{' '}
                {dayRow.topProject || '—'} · AI {fmtPct(dayRow.aiLinePct)}
              </p>
            )}
            <DayTimeline blocks={timeline.data?.data ?? []} />
          </Panel>

          <div className="grid gap-3 lg:grid-cols-3">
            <Panel title="Projects" hint="Click a project to filter branches and files.">
              <BarList
                items={(projects.data?.data ?? []).map((p) => ({
                  key: p.itemName,
                  label: project === p.itemName ? `● ${p.itemName}` : p.itemName,
                  value: p.totalSeconds,
                  display: fmtDuration(p.totalSeconds),
                  sub: fmtPct(p.pct),
                  color: nameColor(p.itemName),
                  onClick: () => setProject((cur) => (cur === p.itemName ? '' : p.itemName)),
                }))}
              />
            </Panel>
            <Panel
              title={project ? `Branches · ${project}` : 'Branches'}
              right={<GitBranch className="h-4 w-4 text-slate-400" />}
            >
              <BarList
                items={(branches.data?.data ?? []).map((b) => ({
                  key: `${b.projectName}/${b.itemName}`,
                  label: b.itemName,
                  value: b.totalSeconds,
                  display: fmtDuration(b.totalSeconds),
                  sub: project ? undefined : b.projectName,
                }))}
                emptyText="No branch data — branch details come from per-project WakaTime summaries."
              />
            </Panel>
            <Panel title={project ? `Files · ${project}` : 'Files'}>
              <BarList
                items={(files.data?.data ?? []).map((e) => ({
                  key: `${e.projectName}/${e.itemName}`,
                  label: e.itemName.split(/[\\/]/).slice(-2).join('/'),
                  value: e.totalSeconds,
                  display: fmtDuration(e.totalSeconds),
                  sub: e.aiLinePct != null ? `AI ${fmtPct(e.aiLinePct)}` : undefined,
                }))}
              />
            </Panel>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <Panel title="Languages">
              <BarList
                items={(languages.data?.data ?? []).map((l) => ({
                  key: l.itemName, label: l.itemName, value: l.totalSeconds, display: fmtDuration(l.totalSeconds), sub: fmtPct(l.pct),
                }))}
              />
            </Panel>
            <Panel title="Activity type" hint="WakaTime categories: coding, AI coding, debugging, building, code reviewing…">
              <BarList
                items={(categories.data?.data ?? []).map((c) => ({
                  key: c.itemName,
                  label: c.itemName,
                  value: c.totalSeconds,
                  display: fmtDuration(c.totalSeconds),
                  sub: fmtPct(c.pct),
                  color: c.itemName.toLowerCase() === 'ai coding' ? AI_COLOR : HUMAN_COLOR,
                }))}
              />
            </Panel>
            <Panel title="Editors & AI tools">
              <BarList
                items={(agents.data?.data ?? []).map((a) => ({
                  key: a.editor,
                  label: a.isAiTool ? `${a.editor} · AI${a.aiModels ? ` (${a.aiModels})` : ''}` : a.editor,
                  value: a.totalSeconds,
                  display: fmtDuration(a.totalSeconds),
                  color: a.isAiTool ? AI_COLOR : HUMAN_COLOR,
                }))}
              />
            </Panel>
          </div>

          <Panel title="Weekly rhythm" hint="Coding time by weekday and hour (IST).">
            <HourlyHeatmap rows={hourly.data?.data ?? []} />
          </Panel>
        </div>
      )}
    </PageWrapper>
  );
}
