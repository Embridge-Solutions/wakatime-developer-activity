'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Clock, ExternalLink, FolderGit2, GitBranch, GitCommitHorizontal, Sparkles, Users } from 'lucide-react';
import PageWrapper from '@/components/layout/pageWrapper';
import ActivityFilterBar from '@/components/activity/ActivityFilterBar';
import LivePanel from '@/components/activity/LivePanel';
import { Notice, Panel, StatTile } from '@/components/activity/Panel';
import { AiHumanSplit, BarList, DailyHoursChart } from '@/components/activity/charts';
import { useActivityFilters } from '@/components/activity/useActivityFilters';
import { fmtDateTime, fmtDay, fmtDuration, fmtPct } from '@/components/activity/format';
import { AI_COLOR, developerColor } from '@/components/activity/palette';
import {
  BranchRow,
  useGetActivityBreakdownQuery,
  useGetProjectBranchesQuery,
  useGetProjectCommitsQuery,
  useGetProjectDailyQuery,
  useGetProjectDevelopersQuery,
  useGetProjectsQuery,
} from '@/redux/slice/activity';

const BRANCH_TONE: Record<BranchRow['branchStatus'], { tone: string; text: string }> = {
  ACTIVE: { tone: 'success', text: 'Active' },
  IDLE: { tone: 'warning', text: 'Idle' },
  STALE: { tone: 'neutral', text: 'Stale' },
};

/** One project: who works on it (now and in the range), daily hours, branches with status, commits, files. */
function ProjectDetail() {
  const params = useSearchParams();
  const projectName = params.get('name') ?? '';
  const { filters, ready, notLinked } = useActivityFilters();
  const skip = !ready || notLinked || !projectName;
  const f = { ...filters, projectName };

  const projects = useGetProjectsQuery(filters, { skip });
  const developers = useGetProjectDevelopersQuery(f, { skip });
  const daily = useGetProjectDailyQuery(f, { skip });
  const branches = useGetProjectBranchesQuery(f, { skip });
  const [branch, setBranch] = useState('');
  const commits = useGetProjectCommitsQuery({ ...f, branch: branch || undefined, top: 100 }, { skip });
  const files = useGetActivityBreakdownQuery({ ...filters, dimension: 'entity', projectName, top: 30 }, { skip });

  const p = projects.data?.data?.find((x) => x.projectName === projectName);
  const devRows = developers.data?.data ?? [];
  const branchRows = branches.data?.data ?? [];
  const commitRows = commits.data?.data ?? [];

  const refreshAll = () => Promise.all([projects, developers, daily, branches, commits, files].map((q) => q.refetch()));

  return (
    <PageWrapper
      title={projectName || 'Project'}
      subtitle="Project dashboard — developers, branches, commits and files"
      titleIcon={<FolderGit2 />}
      showBackButton
      backHref="/projects"
      showRefreshButton
      onRefresh={refreshAll}
      showPrintButton
      noCard
    >
      <ActivityFilterBar />
      {!projectName ? (
        <Notice title="No project selected">Open a project from the Projects screen.</Notice>
      ) : notLinked ? (
        <Notice title="Your login is not tracked in WakaTime yet" tone="warning">Ask an admin to turn on WakaTime tracking for your user.</Notice>
      ) : (
        <div className="space-y-3">
          {p?.repositoryUrl && (
            <a href={p.repositoryUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-600 underline hover:text-slate-900">
              <ExternalLink className="h-3.5 w-3.5" /> {p.repositoryUrl}
            </a>
          )}

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <StatTile label="Coding time" icon={<Clock />} value={p ? fmtDuration(p.totalSeconds) : '—'} sub={p ? `${p.dayCount} active days` : undefined} />
            <StatTile label="Developers" icon={<Users />} value={p?.developerCount ?? '—'} sub={p ? `${p.workingNowCount} working now` : undefined} />
            <StatTile label="Branches" icon={<GitBranch />} value={p?.branchCount ?? '—'} sub={`${branchRows.filter((b) => b.branchStatus === 'ACTIVE').length} active`} />
            <StatTile label="Commits" icon={<GitCommitHorizontal />} value={p?.commitCount ?? '—'} sub="in this range" />
            <StatTile label="AI share of code" icon={<Sparkles />} tone={AI_COLOR} value={fmtPct(p?.aiLinePct)} sub="of line changes" />
            <StatTile label="Last activity" icon={<Clock />} value={p?.lastActivity ? fmtDay(p.lastActivity) : p?.lastActiveDate ? fmtDay(p.lastActiveDate) : '—'} sub={p?.lastActivity ? p.lastActivity.slice(11, 16) : undefined} />
          </div>

          <div className="grid gap-3 xl:grid-cols-[1fr_360px]">
            <Panel title="Daily hours on this project" hint="Stacked by developer.">
              <DailyHoursChart rows={daily.data?.data ?? []} fromDate={filters.fromDate} toDate={filters.toDate} />
            </Panel>
            <LivePanel projectName={projectName} />
          </div>

          <Panel title={`Developers on ${projectName}`} bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-[13px]">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Developer</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Time</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Days</th>
                    <th className="px-3 py-2.5 text-right font-semibold">AI share</th>
                    <th className="px-3 py-2.5 font-semibold">Main branch</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Commits</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Last activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {devRows.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No developer activity on this project in the range.</td></tr>
                  )}
                  {devRows.map((d) => (
                    <tr key={d.developerId}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: developerColor(d.developerId) }} />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">{d.developerName}</p>
                            <p className="truncate text-[11.5px] text-slate-500">{d.team || '—'}</p>
                          </div>
                          {d.isWorkingNow && <span className="ui-pill" data-tone="success" data-live="true">now</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{fmtDuration(d.totalSeconds)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{d.activeDays}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{fmtPct(d.aiLinePct)}</td>
                      <td className="max-w-[220px] truncate px-3 py-2.5">{d.topBranch || '—'}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{d.commitCount}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{fmtDateTime(d.lastActivity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel
            title={`Branches · ${branchRows.length}`}
            hint="Status from coding activity: Active = worked on today or yesterday, Idle = within 7 days, Stale = older. WakaTime does not know merge / pull-request state."
            bodyClassName="p-0"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-[13px]">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Branch</th>
                    <th className="px-3 py-2.5 font-semibold">Status</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Time</th>
                    <th className="px-3 py-2.5 font-semibold">Developers</th>
                    <th className="px-3 py-2.5 font-semibold">Last worked</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Commits</th>
                    <th className="px-4 py-2.5 font-semibold">Last commit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {branchRows.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No branch activity in the range.</td></tr>
                  )}
                  {branchRows.map((b) => (
                    <tr
                      key={b.branch}
                      onClick={() => setBranch((cur) => (cur === b.branch ? '' : b.branch))}
                      className={`cursor-pointer hover:bg-slate-50 ${branch === b.branch ? 'bg-slate-50' : ''}`}
                      title="Click to filter the commits below"
                    >
                      <td className="max-w-[260px] truncate px-4 py-2.5 font-semibold text-slate-900">
                        <span className="inline-flex items-center gap-1.5"><GitBranch className="h-3.5 w-3.5 text-slate-400" />{b.branch}</span>
                      </td>
                      <td className="px-3 py-2.5"><span className="ui-pill" data-tone={BRANCH_TONE[b.branchStatus].tone}>{BRANCH_TONE[b.branchStatus].text}</span></td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{fmtDuration(b.totalSeconds)}</td>
                      <td className="max-w-[200px] truncate px-3 py-2.5">{b.developers || '—'}</td>
                      <td className="px-3 py-2.5 tabular-nums">{fmtDay(b.lastActiveDate, true)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{b.commitCount}</td>
                      <td className="max-w-[280px] truncate px-4 py-2.5 text-slate-600" title={b.lastCommitMessage}>
                        {b.lastCommitMessage ? `${b.lastCommitMessage} · ${fmtDateTime(b.lastCommitDate)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <div className="grid gap-3 xl:grid-cols-[1fr_380px]">
            <Panel
              title={branch ? `Commits · ${branch}` : `Commits · ${commitRows.length}`}
              hint="Commit messages WakaTime links to this project. Only shown for projects whose repository (GitHub / GitLab / Bitbucket) is connected in WakaTime."
              right={branch ? <button type="button" className="text-xs font-semibold text-slate-500 underline cursor-pointer" onClick={() => setBranch('')}>all branches</button> : undefined}
              bodyClassName="p-0"
            >
              {commitRows.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-400">
                  No commits in this range. Commits appear when the project&apos;s repository is connected in WakaTime.
                </p>
              ) : (
                <ul className="max-h-[440px] divide-y divide-slate-100 overflow-y-auto">
                  {commitRows.map((c) => (
                    <li key={c.commitHash} className="flex gap-3 px-4 py-2.5">
                      <GitCommitHorizontal className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-slate-900">{c.message || '(no message)'}</p>
                        <p className="mt-0.5 text-[11.5px] text-slate-500">
                          {c.developerName || c.authorName || c.authorUsername || 'Unknown author'} · {c.branch || '—'} · {fmtDateTime(c.commitDate)}
                          {c.totalSeconds > 0 && ` · ${fmtDuration(c.totalSeconds)} coded`}
                        </p>
                      </div>
                      {c.htmlUrl ? (
                        <a href={c.htmlUrl} target="_blank" rel="noreferrer" className="shrink-0 font-mono text-[12px] text-slate-500 underline hover:text-slate-900">
                          {c.truncatedHash}
                        </a>
                      ) : (
                        <span className="shrink-0 font-mono text-[12px] text-slate-400">{c.truncatedHash}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <div className="space-y-3">
              <Panel title="AI vs human code">
                <AiHumanSplit ai={p?.aiLines ?? 0} human={p?.humanLines ?? 0} />
              </Panel>
              <Panel title="Files">
                <BarList
                  items={(files.data?.data ?? []).map((e) => ({
                    key: e.itemName,
                    label: e.itemName.split(/[\\/]/).slice(-2).join('/'),
                    value: e.totalSeconds,
                    display: fmtDuration(e.totalSeconds),
                    sub: e.aiLinePct != null ? `AI ${fmtPct(e.aiLinePct)}` : undefined,
                  }))}
                />
              </Panel>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}

export default function ProjectDetailPage() {
  return (
    <Suspense fallback={null}>
      <ProjectDetail />
    </Suspense>
  );
}
