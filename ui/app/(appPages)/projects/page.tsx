'use client';

import Link from 'next/link';
import { ExternalLink, FolderGit2, GitBranch, GitCommitHorizontal, Users } from 'lucide-react';
import PageWrapper from '@/components/layout/pageWrapper';
import ActivityFilterBar from '@/components/activity/ActivityFilterBar';
import LivePanel from '@/components/activity/LivePanel';
import { Notice, StatTile } from '@/components/activity/Panel';
import { useActivityFilters } from '@/components/activity/useActivityFilters';
import { fmtDay, fmtDuration, fmtPct, fmtTime, projectHref } from '@/components/activity/format';
import { AI_COLOR, HUMAN_COLOR, nameColor } from '@/components/activity/palette';
import { useGetProjectsQuery } from '@/redux/slice/activity';

/**
 * Every project the team worked on in the range: time, developers, AI share,
 * branches, commits and who is working on it right now. Click a project for detail.
 */
export default function ProjectsPage() {
  const { filters, ready, notLinked } = useActivityFilters();
  const { data, isFetching, refetch } = useGetProjectsQuery(filters, { skip: !ready || notLinked });
  const rows = data?.data ?? [];
  const totals = {
    seconds: rows.reduce((s, r) => s + r.totalSeconds, 0),
    workingNow: rows.reduce((s, r) => s + r.workingNowCount, 0),
    branches: rows.reduce((s, r) => s + r.branchCount, 0),
    commits: rows.reduce((s, r) => s + r.commitCount, 0),
  };

  return (
    <PageWrapper title="Projects" subtitle="Every project, who works on it, branches and commits" titleIcon={<FolderGit2 />} showRefreshButton onRefresh={refetch} noCard>
      <ActivityFilterBar />
      {notLinked ? (
        <Notice title="Your login is not tracked in WakaTime yet" tone="warning">Ask an admin to turn on WakaTime tracking for your user.</Notice>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatTile label="Projects worked on" icon={<FolderGit2 />} value={rows.length} sub={fmtDuration(totals.seconds) + ' in total'} />
            <StatTile label="Developers working now" icon={<Users />} value={totals.workingNow} sub="across all projects" />
            <StatTile label="Branches active" icon={<GitBranch />} value={totals.branches} sub="in this range" />
            <StatTile label="Commits" icon={<GitCommitHorizontal />} value={totals.commits} sub="repositories linked in WakaTime" />
          </div>

          <div className="grid gap-3 xl:grid-cols-[1fr_360px]">
            <div className="grid content-start gap-3 md:grid-cols-2">
              {rows.length === 0 && (
                <p className="col-span-full rounded-xl border border-dashed border-slate-300 bg-white py-10 text-center text-sm text-slate-400">
                  {isFetching ? 'Loading…' : 'No project activity in this range.'}
                </p>
              )}
              {rows.map((p) => {
                const total = p.aiLines + p.humanLines;
                return (
                  <Link
                    key={p.projectName}
                    href={projectHref(p.projectName)}
                    className="group flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-slate-300 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="h-3 w-3 shrink-0 rounded" style={{ backgroundColor: nameColor(p.projectName) }} />
                        <p className="truncate font-display text-[15px] font-bold text-slate-900 group-hover:underline">{p.projectName}</p>
                      </div>
                      {p.workingNowCount > 0 ? (
                        <span className="ui-pill shrink-0" data-tone="success" data-live="true">{p.workingNowCount} working now</span>
                      ) : (
                        <span className="shrink-0 text-[11.5px] text-slate-400">
                          {p.lastActivity ? `last ${fmtDay(p.lastActivity)} ${fmtTime(p.lastActivity)}` : p.lastActiveDate ? `last ${fmtDay(p.lastActiveDate)}` : ''}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      {[
                        ['Time', fmtDuration(p.totalSeconds)],
                        ['Developers', p.developerCount],
                        ['Branches', p.branchCount],
                        ['Commits', p.commitCount],
                      ].map(([label, value]) => (
                        <div key={String(label)} className="rounded-lg bg-slate-50 px-2 py-1.5">
                          <p className="text-[10.5px] uppercase tracking-wide text-slate-500">{label}</p>
                          <p className="font-semibold tabular-nums text-slate-900">{value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-[12px] text-slate-600">
                      <span className="shrink-0">AI {fmtPct(p.aiLinePct)}</span>
                      <div className="flex h-1.5 flex-1 gap-px overflow-hidden rounded-full bg-slate-100" aria-hidden>
                        {total > 0 && (
                          <>
                            <span style={{ width: `${(p.aiLines / total) * 100}%`, backgroundColor: AI_COLOR }} />
                            <span className="flex-1" style={{ backgroundColor: HUMAN_COLOR }} />
                          </>
                        )}
                      </div>
                      {p.repositoryUrl && (
                        <span className="flex shrink-0 items-center gap-1 text-slate-500">
                          <ExternalLink className="h-3 w-3" /> {p.repositoryProvider || 'repo'}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
            <LivePanel className="h-fit" />
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
