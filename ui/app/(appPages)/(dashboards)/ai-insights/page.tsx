'use client';

import { Bot, Coins, Cpu, MessageSquare, Sparkles, Wrench } from 'lucide-react';
import PageWrapper from '@/components/layout/pageWrapper';
import ActivityFilterBar from '@/components/activity/ActivityFilterBar';
import { Notice, Panel, StatTile } from '@/components/activity/Panel';
import { AiHumanChart, AiHumanSplit, BarList } from '@/components/activity/charts';
import { useActivityFilters } from '@/components/activity/useActivityFilters';
import { aiLines, fmtCompact, fmtDateTime, fmtDuration, fmtNumber, fmtPct, fmtUsd, humanLines } from '@/components/activity/format';
import { AI_COLOR, HUMAN_COLOR, developerColor, nameColor } from '@/components/activity/palette';
import {
  useGetActivityAgentsQuery,
  useGetActivityAiModelsQuery,
  useGetActivityBreakdownQuery,
  useGetActivityDailyQuery,
  useGetActivityDevelopersQuery,
  useGetActivitySummaryQuery,
} from '@/redux/slice/activity';

/** Two-part bar: AI vs human share of one row's line changes. */
const ShareBar = ({ ai, human }: { ai: number; human: number }) => {
  const total = ai + human;
  if (!total) return <span className="text-slate-400">—</span>;
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-1.5 w-24 gap-px overflow-hidden rounded-full" aria-hidden>
        <span style={{ width: `${(ai / total) * 100}%`, backgroundColor: AI_COLOR }} />
        <span className="flex-1" style={{ backgroundColor: HUMAN_COLOR }} />
      </div>
      <span className="tabular-nums">{fmtPct((ai / total) * 100)}</span>
    </div>
  );
};

/**
 * AI Insights — how much code AI writes vs developers, which AI tools
 * ("agents") and models are used, tokens and estimated cost, per developer and project.
 */
export default function AiInsightsPage() {
  const { filters, ready, notLinked } = useActivityFilters();
  const skip = !ready || notLinked;

  const summary = useGetActivitySummaryQuery(filters, { skip });
  const daily = useGetActivityDailyQuery(filters, { skip });
  const developers = useGetActivityDevelopersQuery(filters, { skip });
  const agents = useGetActivityAgentsQuery(filters, { skip });
  const models = useGetActivityAiModelsQuery(filters, { skip });
  const projects = useGetActivityBreakdownQuery({ ...filters, dimension: 'project', top: 30 }, { skip });

  const s = summary.data?.data;
  const agentRows = agents.data?.data ?? [];
  const aiTools = agentRows.filter((a) => a.isAiTool);
  const modelRows = models.data?.data ?? [];
  const devRows = (developers.data?.data ?? []).filter((d) => aiLines(d) + humanLines(d) > 0);
  const projectRows = (projects.data?.data ?? []).filter((p) => aiLines(p) + humanLines(p) > 0);

  const refreshAll = () => Promise.all([summary, daily, developers, agents, models, projects].map((q) => q.refetch()));

  return (
    <PageWrapper
      title="AI Insights"
      subtitle="AI vs human code, AI tools, models, tokens and cost — from WakaTime's AI tracking"
      titleIcon={<Sparkles />}
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
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <StatTile label="AI share of code" tone={AI_COLOR} icon={<Sparkles />} value={fmtPct(s?.aiLinePct)} sub={s?.prevAiLinePct != null ? `was ${fmtPct(s.prevAiLinePct)}` : 'of line changes'} />
            <StatTile label="AI lines" tone={AI_COLOR} value={s ? fmtNumber(aiLines(s)) : '—'} sub={s ? `+${fmtNumber(s.aiAdditions)} / −${fmtNumber(s.aiDeletions)}` : undefined} />
            <StatTile label="Human lines" tone={HUMAN_COLOR} value={s ? fmtNumber(humanLines(s)) : '—'} sub={s ? `+${fmtNumber(s.humanAdditions)} / −${fmtNumber(s.humanDeletions)}` : undefined} />
            <StatTile label="AI coding time" icon={<Bot />} value={s ? fmtDuration(s.aiCodingSeconds) : '—'} sub={s?.aiCodingPct != null ? `${fmtPct(s.aiCodingPct)} of coding time` : undefined} />
            <StatTile label="Sessions · prompts" icon={<MessageSquare />} value={s ? `${fmtNumber(s.aiSessions)} · ${fmtNumber(s.aiPromptEvents)}` : '—'} sub={s ? `${fmtCompact(s.aiInputTokens)} in · ${fmtCompact(s.aiOutputTokens)} out tokens` : undefined} />
            <StatTile label="AI cost (est.)" icon={<Coins />} value={fmtUsd(s?.aiCostUsd)} sub={s ? `${s.aiToolCount} AI tools · ${s.aiModelCount} models` : undefined} higherIsBetter={false} />
          </div>

          <div className="grid gap-3 xl:grid-cols-3">
            <Panel title="AI vs human lines per day" className="xl:col-span-2">
              <AiHumanChart rows={daily.data?.data ?? []} fromDate={filters.fromDate} toDate={filters.toDate} />
            </Panel>
            <Panel title="Overall split">
              <AiHumanSplit ai={s ? aiLines(s) : 0} human={s ? humanLines(s) : 0} />
              <p className="mt-4 text-[12px] leading-relaxed text-slate-500">
                Line changes are additions + deletions as WakaTime attributes them: lines written by GenAI tools vs typed by
                the developer. Cost is WakaTime's estimate from model token usage.
              </p>
            </Panel>
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            <Panel
              title={`AI tools (agents) used · ${aiTools.length}`}
              hint="Editors / plugins where WakaTime saw AI line changes or detected an AI model."
              right={<Wrench className="h-4 w-4 text-slate-400" />}
              bodyClassName="p-0"
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-[13px]">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Tool</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Time</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Devs</th>
                      <th className="px-3 py-2.5 font-semibold">AI share</th>
                      <th className="px-4 py-2.5 font-semibold">Models · last seen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {agentRows.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No editors or AI tools in this range.</td></tr>
                    )}
                    {agentRows.map((a) => (
                      <tr key={a.editor}>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{a.editor}</span>
                            {a.isAiTool && <span className="ui-pill" data-tone="brand">AI</span>}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{fmtDuration(a.totalSeconds)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{a.developerCount}</td>
                        <td className="px-3 py-2.5"><ShareBar ai={aiLines(a)} human={humanLines(a)} /></td>
                        <td className="px-4 py-2.5 text-[12px] text-slate-500">
                          {a.aiModels || '—'}
                          <span className="block">{a.lastSeen ? fmtDateTime(a.lastSeen) : ''}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel title={`AI models · ${modelRows.length}`} right={<Cpu className="h-4 w-4 text-slate-400" />} bodyClassName="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-[13px]">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Model</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Lines</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Input tokens</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Output tokens</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Devs</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {modelRows.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No AI model usage reported in this range.</td></tr>
                    )}
                    {modelRows.map((m) => (
                      <tr key={m.modelName}>
                        <td className="px-4 py-2.5">
                          <span className="flex items-center gap-2 font-semibold text-slate-900">
                            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: nameColor(m.modelName) }} />
                            {m.modelName}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{fmtNumber(m.lineChanges)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{fmtCompact(m.inputTokens)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{fmtCompact(m.outputTokens)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{m.developerCount}</td>
                        <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{fmtUsd(m.costUsd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            <Panel title="AI share by developer" hint="Share of each developer's line changes written by AI.">
              <BarList
                items={devRows
                  .map((d) => ({
                    key: String(d.developerId),
                    label: d.developerName,
                    value: d.aiLinePct ?? 0,
                    display: fmtPct(d.aiLinePct),
                    sub: `${fmtNumber(aiLines(d))} AI · ${fmtNumber(humanLines(d))} human · ${fmtUsd(d.aiCostUsd)}`,
                    color: developerColor(d.developerId),
                  }))
                  .sort((a, b) => b.value - a.value)}
                emptyText="No AI / human line changes reported in this range."
              />
            </Panel>
            <Panel title="AI share by project">
              <BarList
                items={projectRows
                  .map((p) => ({
                    key: p.itemName,
                    label: p.itemName,
                    value: p.aiLinePct ?? 0,
                    display: fmtPct(p.aiLinePct),
                    sub: `${fmtNumber(aiLines(p))} AI · ${fmtNumber(humanLines(p))} human`,
                    color: nameColor(p.itemName),
                  }))
                  .sort((a, b) => b.value - a.value)}
                emptyText="No AI / human line changes reported in this range."
              />
            </Panel>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
