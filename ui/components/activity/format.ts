import { format, parseISO } from 'date-fns';

/** 13500 s → "3h 45m"; under an hour → "45m"; 0 → "0m". */
export const fmtDuration = (seconds?: number | null) => {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

/** Seconds → hours with one decimal, for chart axes and tables. */
export const toHours = (seconds?: number | null) => Math.round(((Number(seconds) || 0) / 3600) * 10) / 10;

export const fmtNumber = (v?: number | null) =>
  v === null || v === undefined || Number.isNaN(Number(v)) ? '—' : Number(v).toLocaleString('en-IN');

/** 1_250_000 → "1.3M", 12_400 → "12.4K" */
export const fmtCompact = (v?: number | null) =>
  v === null || v === undefined ? '—' : new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(v));

export const fmtPct = (v?: number | null) => (v === null || v === undefined ? '—' : `${Number(v).toFixed(1)}%`);

export const fmtUsd = (v?: number | null) =>
  v === null || v === undefined ? '—' : `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** "2026-10-17" → "17 Oct" (short) or "17 Oct 2026" */
export const fmtDay = (day?: string | null, withYear = false) =>
  day ? format(parseISO(day.slice(0, 10)), withYear ? 'dd MMM yyyy' : 'dd MMM') : '—';

/** "2026-10-17T09:30:00" → "09:30" */
export const fmtTime = (value?: string | null) => (value ? value.slice(11, 16) : '—');

/** "2026-10-17T09:30:00" → "17 Oct 2026, 09:30" */
export const fmtDateTime = (value?: string | null) =>
  value ? `${format(parseISO(value.slice(0, 10)), 'dd MMM yyyy')}, ${value.slice(11, 16)}` : '—';

/** Change vs previous period in %, or undefined when there is no base to compare with. */
export const changePct = (current?: number | null, previous?: number | null) => {
  const c = Number(current) || 0;
  const p = Number(previous) || 0;
  return p > 0 ? ((c - p) / p) * 100 : undefined;
};

/** Sum of AI and human line changes (additions + deletions). */
export const aiLines = (r: { aiAdditions?: number; aiDeletions?: number }) => (r.aiAdditions || 0) + (r.aiDeletions || 0);
export const humanLines = (r: { humanAdditions?: number; humanDeletions?: number }) =>
  (r.humanAdditions || 0) + (r.humanDeletions || 0);

/** Link to a project's detail dashboard. */
export const projectHref = (projectName: string) => `/projects/detail?name=${encodeURIComponent(projectName)}`;
