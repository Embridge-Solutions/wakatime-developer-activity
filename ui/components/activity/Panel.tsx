'use client';

import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Card for one chart / list on a dashboard: title, optional hint and right-side controls. */
export function Panel({
  title,
  hint,
  right,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  hint?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn('ui-card flex min-w-0 flex-col', className)}>
      <header className="ui-card-head gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="ui-card-title truncate">{title}</p>
          {hint && (
            <span className="text-slate-400" title={hint} aria-label={hint}>
              <Info className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
        {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
      </header>
      <div className={cn('min-w-0 flex-1 p-4', bodyClassName)}>{children}</div>
    </section>
  );
}

/** Headline number with an optional "vs previous period" change. */
export function StatTile({
  label,
  value,
  sub,
  icon,
  change,
  higherIsBetter = true,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  /** % change vs previous period */
  change?: number;
  higherIsBetter?: boolean;
  /** Small coloured dot when the tile stands for a chart series (e.g. AI / Human). */
  tone?: string;
}) {
  const hasChange = typeof change === 'number' && Number.isFinite(change);
  const good = hasChange && (higherIsBetter ? change! >= 0 : change! <= 0);
  return (
    <div className="flex min-w-0 flex-col justify-between rounded-xl border border-slate-200/90 bg-white px-4 py-3.5 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-1.5 truncate text-xs font-semibold text-slate-500">
          {tone && <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: tone }} />}
          {label}
        </p>
        {icon && <span className="shrink-0 text-slate-400 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
      </div>
      <p className="mt-1.5 truncate font-display text-2xl font-bold tracking-tight text-slate-900 tabular-nums">{value}</p>
      <div className="mt-1 flex min-h-4 items-center gap-2 text-[11.5px] text-slate-500">
        {hasChange && (
          <span className={cn('font-semibold tabular-nums', good ? 'text-emerald-600' : 'text-rose-600')}>
            {change! > 0 ? '▲' : change! < 0 ? '▼' : '•'} {Math.abs(change!).toFixed(0)}%
          </span>
        )}
        {sub && <span className="truncate">{sub}</span>}
      </div>
    </div>
  );
}

/** Empty / not-linked / error message inside a page. */
export function Notice({ title, children, tone = 'info' }: { title: string; children?: React.ReactNode; tone?: 'info' | 'warning' | 'danger' }) {
  return (
    <div className="ui-status-card" data-tone={tone}>
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      {children && <div className="mt-1 text-[13px] leading-relaxed text-slate-600">{children}</div>}
    </div>
  );
}
