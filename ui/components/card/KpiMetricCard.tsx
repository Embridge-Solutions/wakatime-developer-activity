'use client';

import React from 'react';
import { ArrowUp, ArrowDown, LucideIcon } from 'lucide-react';
import { Sparkline } from '@/components/common/Sparkline';
import { cn } from '@/lib/utils';

export interface KpiMetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  subLabel?: string;
  changePct?: number;
  changePeriodText?: string;
  lowerIsBetter?: boolean;
  sparklineData?: number[];
  sparklineColor?: string;
  badge?: {
    text: string;
    variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
    icon?: React.ReactNode;
  };
  customRightElement?: React.ReactNode;
  className?: string;
}

const BADGE_VARIANTS = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  warning: 'bg-amber-50 text-amber-700 border-amber-200/60',
  danger: 'bg-rose-50 text-rose-700 border-rose-200/60',
  info: 'bg-blue-50 text-blue-700 border-blue-200/60',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200/60',
};

export const KpiMetricCard: React.FC<KpiMetricCardProps> = ({
  label,
  value,
  unit,
  icon,
  iconBgColor = 'bg-blue-50',
  iconColor = 'text-blue-600',
  subLabel,
  changePct,
  changePeriodText,
  lowerIsBetter = true,
  sparklineData,
  sparklineColor = '#10b981',
  badge,
  customRightElement,
  className,
}) => {
  const hasChange = typeof changePct === 'number';
  const isGood = hasChange ? (lowerIsBetter ? changePct <= 0 : changePct >= 0) : true;

  return (
    <div
      className={cn(
        'relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:shadow-md',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-2xl',
              iconBgColor,
              iconColor,
            )}
          >
            {icon}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">{label}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold tracking-tight text-slate-900">
                {value}
                {unit && <span className="ml-1 text-base font-semibold text-slate-600">{unit}</span>}
              </p>
              {subLabel && <span className="text-xs font-semibold text-slate-500">{subLabel}</span>}
            </div>
          </div>
        </div>

        {sparklineData && sparklineData.length > 1 ? (
          <div className="hidden sm:block">
            <Sparkline data={sparklineData} color={sparklineColor} width={90} height={32} />
          </div>
        ) : customRightElement ? (
          <div>{customRightElement}</div>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        {hasChange ? (
          <div className="flex items-center gap-1.5 text-xs">
            <span
              className={cn(
                'flex items-center font-bold',
                isGood ? 'text-emerald-600' : 'text-rose-600',
              )}
            >
              {changePct > 0 ? (
                <ArrowUp className="mr-0.5 h-3.5 w-3.5 stroke-[2.5]" />
              ) : (
                <ArrowDown className="mr-0.5 h-3.5 w-3.5 stroke-[2.5]" />
              )}
              {Math.abs(Math.round(changePct))}%
            </span>
            {changePeriodText && <span className="text-slate-500">{changePeriodText}</span>}
          </div>
        ) : badge ? (
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold',
              BADGE_VARIANTS[badge.variant || 'neutral'],
            )}
          >
            {badge.icon}
            {badge.text}
          </span>
        ) : (
          <span className="text-xs text-slate-400">Baseline metric</span>
        )}

        {hasChange && badge && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold',
              BADGE_VARIANTS[badge.variant || 'neutral'],
            )}
          >
            {badge.icon}
            {badge.text}
          </span>
        )}
      </div>
    </div>
  );
};

export default KpiMetricCard;
