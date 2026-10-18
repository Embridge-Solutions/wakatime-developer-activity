'use client';

import { useMemo, useState } from 'react';
import { addDays, format, parseISO } from 'date-fns';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AXIS, ChartTooltip, EmptyChart, GRID, Legend, SURFACE } from '@/components/chart/viz-kit';
import type { DailyRow, HourlyRow, TimelineRow } from '@/redux/slice/activity';
import { AI_COLOR, HEAT, HUMAN_COLOR, OTHER, developerColor, nameColor } from './palette';
import { aiLines, fmtDuration, fmtNumber, fmtPct, fmtTime, humanLines, toHours } from './format';

/** Every day of the range, so days without activity show as gaps, not missing ticks. */
export const eachDay = (fromDate: string, toDate: string) => {
  const out: string[] = [];
  for (let d = parseISO(fromDate); format(d, 'yyyy-MM-dd') <= toDate && out.length < 400; d = addDays(d, 1)) {
    out.push(format(d, 'yyyy-MM-dd'));
  }
  return out;
};

const dayTick = (day: string) => format(parseISO(day), 'dd MMM');

/* ─── Daily coding hours, stacked by developer ───────────────────────────── */

const MAX_SERIES = 7; // + "Other" = 8, the palette limit

/**
 * Coding hours per day. Team view: one stacked segment per developer (top 7 by
 * total, the rest folded into "Other"); one developer: a single series.
 */
export function DailyHoursChart({
  rows,
  fromDate,
  toDate,
  height = 260,
}: {
  rows: DailyRow[];
  fromDate: string;
  toDate: string;
  height?: number;
}) {
  const { data, series } = useMemo(() => {
    const totals = new Map<number, { name: string; seconds: number }>();
    for (const r of rows) {
      const t = totals.get(r.developerId) ?? { name: r.developerName, seconds: 0 };
      t.seconds += r.totalSeconds;
      totals.set(r.developerId, t);
    }
    const ranked = [...totals.entries()].sort((a, b) => b[1].seconds - a[1].seconds);
    const shown = ranked.slice(0, MAX_SERIES).map(([id, t]) => ({ key: `d${id}`, id, name: t.name, color: developerColor(id) }));
    const shownIds = new Set(shown.map((s) => s.id));
    const hasOther = ranked.length > MAX_SERIES;

    const byDay = new Map<string, Record<string, number | string>>();
    for (const day of eachDay(fromDate, toDate)) byDay.set(day, { day });
    for (const r of rows) {
      const row = byDay.get(r.activityDate);
      if (!row) continue;
      const key = shownIds.has(r.developerId) ? `d${r.developerId}` : 'other';
      row[key] = Math.round(((Number(row[key]) || 0) + r.totalSeconds / 3600) * 10) / 10;
    }
    return {
      data: [...byDay.values()],
      series: hasOther ? [...shown, { key: 'other', id: 0, name: 'Other', color: OTHER }] : shown,
    };
  }, [rows, fromDate, toDate]);

  if (!rows.length) return <EmptyChart height={height} />;

  return (
    <div>
      {series.length > 1 && (
        <div className="mb-2">
          <Legend items={series.map((s) => ({ name: s.name, color: s.color }))} />
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="day" tickFormatter={dayTick} tick={AXIS} tickLine={false} axisLine={false} minTickGap={12} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} unit="h" allowDecimals={false} width={44} />
          <Tooltip
            cursor={{ fill: 'rgba(15,23,42,0.04)' }}
            content={(p: any) => <ChartTooltip {...p} label={p.label ? format(parseISO(p.label), 'EEE, dd MMM') : ''} unit="h" total />}
          />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.name}
              stackId="hours"
              fill={s.color}
              stroke={SURFACE}
              strokeWidth={1}
              maxBarSize={36}
              radius={i === series.length - 1 ? [4, 4, 0, 0] : 0}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── AI vs human line changes per day ───────────────────────────────────── */

export function AiHumanChart({
  rows,
  fromDate,
  toDate,
  height = 240,
}: {
  rows: DailyRow[];
  fromDate: string;
  toDate: string;
  height?: number;
}) {
  const data = useMemo(() => {
    const byDay = new Map<string, { day: string; human: number; ai: number }>();
    for (const day of eachDay(fromDate, toDate)) byDay.set(day, { day, human: 0, ai: 0 });
    for (const r of rows) {
      const d = byDay.get(r.activityDate);
      if (!d) continue;
      d.human += humanLines(r);
      d.ai += aiLines(r);
    }
    return [...byDay.values()];
  }, [rows, fromDate, toDate]);

  const any = data.some((d) => d.ai + d.human > 0);
  if (!any) return <EmptyChart height={height} message="No AI / human line changes reported for this range." />;

  return (
    <div>
      <div className="mb-2">
        <Legend items={[{ name: 'Human lines', color: HUMAN_COLOR }, { name: 'AI lines', color: AI_COLOR }]} />
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -6, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="day" tickFormatter={dayTick} tick={AXIS} tickLine={false} axisLine={false} minTickGap={12} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => fmtNumber(v)} />
          <Tooltip
            cursor={{ fill: 'rgba(15,23,42,0.04)' }}
            content={(p: any) => <ChartTooltip {...p} label={p.label ? format(parseISO(p.label), 'EEE, dd MMM') : ''} total />}
          />
          <Bar dataKey="human" name="Human lines" stackId="lines" fill={HUMAN_COLOR} stroke={SURFACE} strokeWidth={1} maxBarSize={36} />
          <Bar dataKey="ai" name="AI lines" stackId="lines" fill={AI_COLOR} stroke={SURFACE} strokeWidth={1} maxBarSize={36} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── AI vs human split (one number, so a bar — not a 2-slice pie) ───────── */

export function AiHumanSplit({ ai, human }: { ai: number; human: number }) {
  const total = ai + human;
  const aiPct = total ? (ai / total) * 100 : 0;
  if (!total) return <p className="text-sm text-slate-400">No AI / human line changes reported for this range.</p>;
  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: AI_COLOR }} /> AI
          </p>
          <p className="font-display text-2xl font-bold tabular-nums text-slate-900">{fmtPct(aiPct)}</p>
          <p className="text-xs text-slate-500 tabular-nums">{fmtNumber(ai)} lines</p>
        </div>
        <div className="text-right">
          <p className="flex items-center justify-end gap-1.5 text-xs font-semibold text-slate-500">
            Human <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: HUMAN_COLOR }} />
          </p>
          <p className="font-display text-2xl font-bold tabular-nums text-slate-900">{fmtPct(100 - aiPct)}</p>
          <p className="text-xs text-slate-500 tabular-nums">{fmtNumber(human)} lines</p>
        </div>
      </div>
      <div className="mt-3 flex h-3 w-full gap-0.5 overflow-hidden rounded-full" role="img" aria-label={`AI ${aiPct.toFixed(1)}%, human ${(100 - aiPct).toFixed(1)}%`}>
        <span className="h-full rounded-l-full" style={{ width: `${aiPct}%`, backgroundColor: AI_COLOR }} title={`AI ${fmtPct(aiPct)}`} />
        <span className="h-full flex-1 rounded-r-full" style={{ backgroundColor: HUMAN_COLOR }} title={`Human ${fmtPct(100 - aiPct)}`} />
      </div>
    </div>
  );
}

/* ─── Horizontal bar list (top projects, languages, editors…) ────────────── */

export interface BarListItem {
  key: string;
  label: string;
  value: number;
  display: string;
  sub?: string;
  color?: string;
  onClick?: () => void;
}

/** Ranked list with proportional bars — one series, so one colour unless the item has its own identity colour. */
export function BarList({ items, emptyText = 'No data for the selected filters.', limit = 8 }: { items: BarListItem[]; emptyText?: string; limit?: number }) {
  const [showAll, setShowAll] = useState(false);
  if (!items.length) return <p className="py-6 text-center text-sm text-slate-400">{emptyText}</p>;
  const max = Math.max(...items.map((i) => i.value), 1);
  const visible = showAll ? items : items.slice(0, limit);
  return (
    <div>
      <ul className="space-y-2.5">
        {visible.map((i) => (
          <li key={i.key}>
            <button
              type="button"
              onClick={i.onClick}
              disabled={!i.onClick}
              title={`${i.label} · ${i.display}${i.sub ? ` · ${i.sub}` : ''}`}
              className="group block w-full text-left disabled:cursor-default enabled:cursor-pointer"
            >
              <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
                <span className="truncate font-medium text-slate-700 group-enabled:group-hover:text-slate-950">{i.label}</span>
                <span className="shrink-0 tabular-nums text-slate-900">
                  <span className="font-semibold">{i.display}</span>
                  {i.sub && <span className="ml-2 text-xs text-slate-500">{i.sub}</span>}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${Math.max(2, (i.value / max) * 100)}%`, backgroundColor: i.color ?? HUMAN_COLOR }}
                />
              </div>
            </button>
          </li>
        ))}
      </ul>
      {items.length > limit && (
        <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-3 text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer">
          {showAll ? 'Show less' : `Show all ${items.length}`}
        </button>
      )}
    </div>
  );
}

/* ─── Weekday × hour heatmap ─────────────────────────────────────────────── */

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** When during the week code gets written — sequential single-hue ramp, darker = more time. */
export function HourlyHeatmap({ rows }: { rows: HourlyRow[] }) {
  const [hover, setHover] = useState<{ d: number; h: number } | null>(null);
  const grid = useMemo(() => {
    const g = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
    for (const r of rows) if (r.weekday >= 1 && r.weekday <= 7) g[r.weekday - 1][r.hourOfDay] += r.totalSeconds;
    return g;
  }, [rows]);
  const max = Math.max(...grid.flat(), 0);
  if (!max) return <EmptyChart height={180} />;

  const step = (v: number) => (v <= 0 ? 0 : Math.min(HEAT.length - 1, 1 + Math.floor((v / max) * (HEAT.length - 1))));
  const hovered = hover ? grid[hover.d][hover.h] : 0;

  return (
    <div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[560px] gap-[3px]" style={{ gridTemplateColumns: '34px repeat(24, minmax(0, 1fr))' }}>
          <span />
          {Array.from({ length: 24 }, (_, h) => (
            <span key={h} className="text-center text-[10px] text-slate-400 tabular-nums">
              {h % 3 === 0 ? String(h).padStart(2, '0') : ''}
            </span>
          ))}
          {grid.map((hours, d) => (
            <div key={d} className="contents">
              <span className="pr-1 text-right text-[11px] leading-[18px] text-slate-500">{WEEKDAYS[d]}</span>
              {hours.map((v, h) => (
                <span
                  key={h}
                  onMouseEnter={() => setHover({ d, h })}
                  onMouseLeave={() => setHover(null)}
                  title={`${WEEKDAYS[d]} ${String(h).padStart(2, '0')}:00 · ${fmtDuration(v)}`}
                  className="h-[18px] rounded-[3px] ring-slate-900/40 hover:ring-2"
                  style={{ backgroundColor: HEAT[step(v)] }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
        <span className="min-h-4 tabular-nums">
          {hover ? `${WEEKDAYS[hover.d]} ${String(hover.h).padStart(2, '0')}:00–${String(hover.h + 1).padStart(2, '0')}:00 · ${fmtDuration(hovered)}` : 'Hover a cell for the time coded in that hour'}
        </span>
        <span className="flex items-center gap-1">
          Less
          {HEAT.slice(1).map((c) => (
            <span key={c} className="h-2.5 w-3.5 rounded-[2px]" style={{ backgroundColor: c }} />
          ))}
          More
        </span>
      </div>
    </div>
  );
}

/* ─── One developer-day timeline ─────────────────────────────────────────── */

const minutesOf = (t: string) => Number(t.slice(11, 13)) * 60 + Number(t.slice(14, 16));

/** Work blocks across the day (local time), coloured by project. */
export function DayTimeline({ blocks }: { blocks: TimelineRow[] }) {
  const [hover, setHover] = useState<TimelineRow | null>(null);
  const projects = useMemo(() => [...new Set(blocks.map((b) => b.sliceValue || 'Unknown'))], [blocks]);
  if (!blocks.length) return <EmptyChart height={120} message="No work blocks recorded for this day." />;

  const first = Math.min(...blocks.map((b) => minutesOf(b.startTime)));
  const last = Math.max(...blocks.map((b) => minutesOf(b.startTime) + b.durationSeconds / 60));
  const from = Math.max(0, Math.floor(first / 60) * 60 - 60);
  const to = Math.min(24 * 60, Math.ceil(last / 60) * 60 + 60);
  const span = Math.max(60, to - from);
  const hours = Array.from({ length: Math.floor(span / 60) + 1 }, (_, i) => from / 60 + i);

  return (
    <div>
      {projects.length > 1 && (
        <div className="mb-3">
          <Legend items={projects.slice(0, 8).map((p) => ({ name: p, color: nameColor(p) }))} />
        </div>
      )}
      <div className="relative h-10 w-full rounded-lg bg-slate-100">
        {blocks.map((b, i) => {
          const start = minutesOf(b.startTime);
          const left = ((start - from) / span) * 100;
          const width = Math.max(0.4, (b.durationSeconds / 60 / span) * 100);
          return (
            <span
              key={i}
              onMouseEnter={() => setHover(b)}
              onMouseLeave={() => setHover(null)}
              title={`${b.sliceValue} · ${fmtTime(b.startTime)}–${fmtTime(b.endTime)} · ${fmtDuration(b.durationSeconds)}`}
              className="absolute top-1.5 bottom-1.5 rounded-[4px] ring-white hover:ring-2"
              style={{ left: `${left}%`, width: `${width}%`, backgroundColor: nameColor(b.sliceValue || 'Unknown') }}
            />
          );
        })}
      </div>
      <div className="relative mt-1 h-4 text-[10px] text-slate-400 tabular-nums">
        {hours.map((h) => (
          <span key={h} className="absolute -translate-x-1/2" style={{ left: `${((h * 60 - from) / span) * 100}%` }}>
            {String(h % 24).padStart(2, '0')}:00
          </span>
        ))}
      </div>
      <p className="mt-2 min-h-4 text-[12px] text-slate-600 tabular-nums">
        {hover
          ? `${hover.sliceValue} · ${fmtTime(hover.startTime)}–${fmtTime(hover.endTime)} · ${fmtDuration(hover.durationSeconds)} · AI ${fmtNumber(aiLines(hover))} / human ${fmtNumber(humanLines(hover))} lines`
          : `${blocks.length} work blocks · ${fmtDuration(blocks.reduce((s, b) => s + b.durationSeconds, 0))} · hover a block for details`}
      </p>
    </div>
  );
}

export { toHours };
