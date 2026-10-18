'use client';

/**
 * Shared chart styling for recharts dashboards: recessive axes and grid,
 * a compact tooltip (values in text colour, swatch carries identity),
 * legend chips and an empty state.
 */

/* ─── Shared chart styling ───────────────────────────────────────────────── */

export const AXIS = { fontSize: 11, fill: '#7b7b76' } as const; // graphite-500
export const GRID = '#eeeeec'; // graphite-100 — recessive
export const SURFACE = '#ffffff'; // 2px gap between stacked/adjacent fills

type TooltipEntry = { name?: string; value?: number | string; color?: string; dataKey?: string | number };

/** Compact white tooltip; values in text colour, a swatch carries identity. */
export const ChartTooltip = ({
  active,
  payload,
  label,
  unit = '',
  total,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  unit?: string;
  total?: boolean;
}) => {
  if (!active || !payload?.length) return null;
  const sum = payload.reduce((s, p) => s + (Number(p.value) || 0), 0);
  return (
    <div className="min-w-[150px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold text-slate-900">{label}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="flex items-center justify-between gap-4 text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: p.color }} />
            {p.name}
          </span>
          <span className="font-semibold text-slate-900 tabular-nums">
            {p.value ?? '—'}
            {p.value !== null && p.value !== undefined && unit}
          </span>
        </p>
      ))}
      {total && payload.length > 1 && (
        <p className="mt-1 flex justify-between border-t border-slate-100 pt-1 font-semibold text-slate-900">
          <span>Total</span>
          <span className="tabular-nums">
            {sum}
            {unit}
          </span>
        </p>
      )}
    </div>
  );
};

/** Legend chips — always shown for 2+ series. */
export const Legend = ({ items }: { items: { name: string; color: string; dashed?: boolean }[] }) => (
  <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
    {items.map((i) => (
      <li key={i.name} className="flex items-center gap-1.5">
        {i.dashed ? (
          <span className="w-4 border-t-2 border-dashed" style={{ borderColor: i.color }} />
        ) : (
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: i.color }} />
        )}
        {i.name}
      </li>
    ))}
  </ul>
);

export const EmptyChart = ({ height, message = 'No data for the selected filters.' }: { height: number; message?: string }) => (
  <div className="flex items-center justify-center text-sm text-slate-400" style={{ height }}>
    {message}
  </div>
);
