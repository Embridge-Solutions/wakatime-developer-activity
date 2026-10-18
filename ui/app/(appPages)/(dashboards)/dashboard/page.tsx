'use client';

import { useRouter } from 'next/navigation';
import { Bot, Clock, Coins, FolderGit2, LayoutDashboard, Sparkles, Users } from 'lucide-react';
import PageWrapper from '@/components/layout/pageWrapper';
import ActivityFilterBar from '@/components/activity/ActivityFilterBar';
import LivePanel from '@/components/activity/LivePanel';
import { Notice, Panel, StatTile } from '@/components/activity/Panel';
import { AiHumanChart, AiHumanSplit, BarList, DailyHoursChart, HourlyHeatmap } from '@/components/activity/charts';
import { useActivityFilters } from '@/components/activity/useActivityFilters';
import { aiLines, changePct, fmtDuration, fmtNumber, fmtPct, fmtTime, fmtUsd, humanLines } from '@/components/activity/format';
import { AI_COLOR, HUMAN_COLOR, developerColor, nameColor } from '@/components/activity/palette';
import { useAppDispatch } from '@/redux/hooks';
import { setActivityFilter } from '@/redux/slice/filterSlice';
import {
  useGetActivityAgentsQuery,
  useGetActivityBreakdownQuery,
  useGetActivityDailyQuery,
  useGetActivityDevelopersQuery,
  useGetActivityHourlyQuery,
  useGetActivitySummaryQuery,
} from '@/redux/slice/activity';

/**
 * Team dashboard — the whole team (or one developer / team from the filter):
 * KPIs vs the previous period, daily hours per developer, leaderboard,
 * projects, languages, editors / AI tools, AI vs human and the weekly rhythm.
 */
export default function TeamDashboardPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { filters, ready, notLinked, isAdmin } = useActivityFilters();
  const skip = !ready || notLinked;

  const summary = useGetActivitySummaryQuery(filters, { skip });
  const daily = useGetActivityDailyQuery(filters, { skip });
  const developers = useGetActivityDevelopersQuery(filters, { skip });
  const projects = useGetActivityBreakdownQuery({ ...filters, dimension: 'project', top: 20 }, { skip });
  const languages = useGetActivityBreakdownQuery({ ...filters, dimension: 'language', top: 20 }, { skip });
  const agents = useGetActivityAgentsQuery(filters, { skip });
  const hourly = useGetActivityHourlyQuery(filters, { skip });

  const s = summary.data?.data;
  const dailyRows = daily.data?.data ?? [];
  const devRows = developers.data?.data ?? [];

  const refreshAll = () =>
    Promise.all([summary, daily, developers, projects, languages, agents, hourly].map((q) => q.refetch()));

  const openDeveloper = (developerId: number) => {
    dispatch(setActivityFilter({ developerId }));
    router.push('/developer-dashboard');
  };

  const prevText = s ? `vs ${s.rangeDays}d before` : undefined;

  return (
    <PageWrapper
      title="Team Dashboard"
      subtitle="Coding activity from WakaTime — every developer, every day"
      titleIcon={<LayoutDashboard />}
      showRefreshButton
      onRefresh={refreshAll}
      showPrintButton
      noCard
    >
      <ActivityFilterBar />

      {notLinked ? (
        <Notice title="Your login is not tracked in WakaTime yet" tone="warning">
          Ask an admin to turn on WakaTime tracking for your user.
        </Notice>
      ) : (
        <div className="space-y-3">
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <StatTile
              label="Coding time"
              icon={<Clock />}
              value={s ? fmtDuration(s.totalSeconds) : '—'}
              change={changePct(s?.totalSeconds, s?.prevTotalSeconds)}
              sub={prevText}
            />
            <StatTile
              label="Active developers"
              icon={<Users />}
              value={s ? `${s.activeDevelopers} / ${s.registeredDevelopers}` : '—'}
              sub={s ? `${s.activeDeveloperDays} developer-days` : undefined}
            />
            <StatTile
              label="Avg per active day"
              icon={<Clock />}
              value={s?.avgHoursPerActiveDay != null ? `${s.avgHoursPerActiveDay}h` : '—'}
              sub="per developer"
            />
            <StatTile
              label="AI share of code"
              icon={<Sparkles />}
              tone={AI_COLOR}
              value={fmtPct(s?.aiLinePct)}
              sub={s?.prevAiLinePct != null ? `was ${fmtPct(s.prevAiLinePct)}` : 'of line changes'}
            />
            <StatTile
              label="AI coding time"
              icon={<Bot />}
              value={s ? fmtDuration(s.aiCodingSeconds) : '—'}
              sub={s?.aiCodingPct != null ? `${fmtPct(s.aiCodingPct)} of coding time` : undefined}
            />
            <StatTile
              label="AI cost (est.)"
              icon={<Coins />}
              value={fmtUsd(s?.aiCostUsd)}
              change={changePct(s?.aiCostUsd, s?.prevAiCostUsd)}
              higherIsBetter={false}
              sub={s ? `${s.aiModelCount} models · ${s.aiToolCount} AI tools` : undefined}
            />
          </div>

          <div className="grid gap-3 xl:grid-cols-3">
            <Panel
              title="Daily coding hours"
              hint="Stacked by developer. The top 7 developers are shown; the rest are grouped as Other."
              className="xl:col-span-2"
            >
              <DailyHoursChart rows={dailyRows} fromDate={filters.fromDate} toDate={filters.toDate} />
            </Panel>
            <Panel title="AI vs human code" hint="Line additions + deletions reported by WakaTime's AI tracking.">
              <AiHumanSplit ai={s ? aiLines(s) : 0} human={s ? humanLines(s) : 0} />
              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-[12.5px]">
                <div>
                  <p className="text-slate-500">AI sessions</p>
                  <p className="font-semibold tabular-nums text-slate-900">{fmtNumber(s?.aiSessions)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Prompts</p>
                  <p className="font-semibold tabular-nums text-slate-900">{fmtNumber(s?.aiPromptEvents)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Input tokens</p>
                  <p className="font-semibold tabular-nums text-slate-900">{fmtNumber(s?.aiInputTokens)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Output tokens</p>
                  <p className="font-semibold tabular-nums text-slate-900">{fmtNumber(s?.aiOutputTokens)}</p>
                </div>
              </div>
            </Panel>
          </div>

          {/* Leaderboard + who is working now */}
          <div className="grid gap-3 xl:grid-cols-[1fr_360px]">
          <Panel
            title={isAdmin ? 'Developers' : 'My activity'}
            hint="Click a developer to open their dashboard."
            bodyClassName="p-0"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-[13px]">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Developer</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Coding time</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Active days</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Avg / day</th>
                    <th className="px-3 py-2.5 font-semibold">AI share</th>
                    <th className="px-3 py-2.5 font-semibold">Top project</th>
                    <th className="px-3 py-2.5 font-semibold">Top language</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Last activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {devRows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                        {developers.isFetching ? 'Loading…' : 'No developers for the selected filters.'}
                      </td>
                    </tr>
                  )}
                  {devRows.map((d) => {
                    const ai = aiLines(d);
                    const total = ai + humanLines(d);
                    return (
                      <tr
                        key={d.developerId}
                        onClick={() => openDeveloper(d.developerId)}
                        className="cursor-pointer hover:bg-slate-50"
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: developerColor(d.developerId) }} />
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-900">{d.developerName}</p>
                              <p className="truncate text-[11.5px] text-slate-500">
                                {[d.team, d.designation].filter(Boolean).join(' · ') || '—'}
                                {!d.isActive && ' · inactive'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-slate-900">{fmtDuration(d.totalSeconds)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{d.activeDays}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{d.avgHoursPerActiveDay != null ? `${d.avgHoursPerActiveDay}h` : '—'}</td>
                        <td className="px-3 py-2.5">
                          {total ? (
                            <div className="flex items-center gap-2">
                              <div className="flex h-1.5 w-20 overflow-hidden rounded-full" aria-hidden>
                                <span style={{ width: `${(ai / total) * 100}%`, backgroundColor: AI_COLOR }} />
                                <span className="flex-1" style={{ backgroundColor: HUMAN_COLOR }} />
                              </div>
                              <span className="tabular-nums">{fmtPct(d.aiLinePct)}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="max-w-[180px] truncate px-3 py-2.5">{d.topProject || '—'}</td>
                        <td className="px-3 py-2.5">{d.topLanguage || '—'}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                          {d.lastActiveDate ? `${d.lastActiveDate.slice(8, 10)}/${d.lastActiveDate.slice(5, 7)} ${fmtTime(d.lastActivity)}` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
          <LivePanel className="h-fit" />
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <Panel title="Top projects" right={<FolderGit2 className="h-4 w-4 text-slate-400" />}>
              <BarList
                items={(projects.data?.data ?? []).map((p) => ({
                  key: p.itemName,
                  label: p.itemName,
                  value: p.totalSeconds,
                  display: fmtDuration(p.totalSeconds),
                  sub: `${p.developerCount} dev`,
                  color: nameColor(p.itemName),
                }))}
              />
            </Panel>
            <Panel title="Languages">
              <BarList
                items={(languages.data?.data ?? []).map((l) => ({
                  key: l.itemName,
                  label: l.itemName,
                  value: l.totalSeconds,
                  display: fmtDuration(l.totalSeconds),
                  sub: fmtPct(l.pct),
                }))}
              />
            </Panel>
            <Panel title="Editors & AI tools" hint="Editors and AI agents seen in WakaTime. AI = AI lines or an AI model was detected for the tool.">
              <BarList
                items={(agents.data?.data ?? []).map((a) => ({
                  key: a.editor,
                  label: a.isAiTool ? `${a.editor} · AI` : a.editor,
                  value: a.totalSeconds,
                  display: fmtDuration(a.totalSeconds),
                  sub: `${a.developerCount} dev`,
                  color: a.isAiTool ? AI_COLOR : HUMAN_COLOR,
                }))}
              />
            </Panel>
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            <Panel title="AI vs human lines per day">
              <AiHumanChart rows={dailyRows} fromDate={filters.fromDate} toDate={filters.toDate} />
            </Panel>
            <Panel title="When the team codes" hint="Coding time by weekday and hour (IST). Each work block counts in the hour it started.">
              <HourlyHeatmap rows={hourly.data?.data ?? []} />
            </Panel>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
