'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useReactToPrint } from 'react-to-print';
import { format } from 'date-fns';
import { ArrowLeft, LayoutGrid, Loader2, Printer, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BRAND, COPYRIGHT_TEXT, PRINT_TITLE } from '@/config/brand.config';
import { REDIRECT_PATH_AFTER_LOGIN } from '@/config/config';
import DialogComponent from './dialogComponent';
import ApiStatusHandler from './api-status-handler';
import { PageWrapperContext } from './page-context';
import { useActivePage } from '@/hooks/useActivePage';

// ─── Types ────────────────────────────────────────────────────────────────────

/** A single custom action button injected into the header right-side */
export interface PageAction {
  /** Visible label – omit for icon-only */
  label?: string;
  /** Lucide icon or any ReactNode */
  icon?: React.ReactNode;
  /** Click handler */
  onClick: () => void;
  /** Colour intent */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  /** Disable the button */
  disabled?: boolean;
  /** Show spinning loader instead of icon */
  loading?: boolean;
  /** Extra class names */
  className?: string;
  /** Tooltip on hover */
  title?: string;
}

export interface PageWrapperProps {
  title: string;
  subtitle?: string;
  titleIcon?: React.ReactNode;
  showBackButton?: boolean;
  /** Custom back handler. Default: previous page, or `backHref`, or home. */
  onBack?: () => void;
  /** Where Back goes when there is no browser history (e.g. opened in a new tab). */
  backHref?: string;
  backLabel?: string;
  showInput?: boolean;
  filterContent?: React.ReactNode;
  onInput?: () => void;
  showRefreshButton?: boolean;
  /** Can return a promise (e.g. RTK Query `refetch`) — the button spins until it settles. Default: router.refresh(). */
  onRefresh?: () => unknown;
  /** Controlled spinner state. Leave undefined to let the wrapper track it. */
  isRefreshing?: boolean;
  /** Same as showPrintButton — the one button prints or saves as PDF. */
  showPdfButton?: boolean;
  /** @deprecated PDF is part of Print now. */
  onPdf?: () => void;
  /** Show the Print / Save-as-PDF button (brand header & footer). Off by default; never shown on table screens. */
  showPrintButton?: boolean;
  /** Custom print handler (replaces the built-in page print). */
  onPrint?: () => void;
  actions?: PageAction[];
  className?: string;
  contentClassName?: string;
  noCard?: boolean;
  isLoading?: boolean | undefined;
  isSuccess?: boolean | undefined;
  isEmpty?: boolean | undefined;
  isError?: boolean | undefined;
  isUninitialized?: boolean | undefined;
  children?: React.ReactNode;
  error?: any | undefined;
  /** Always-visible content rendered above the ApiStatusHandler body.
   *  Use this for PageFilter / query panels that must stay mounted
   *  regardless of the current loading / error / success state. */
  stickyContent?: React.ReactNode;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACTION_VARIANT_CLASS: Record<NonNullable<PageAction['variant']>, string> = {
  primary: 'ui-btn-primary',
  secondary: 'ui-btn-secondary',
  danger: 'ui-btn-danger',
  ghost: 'ui-btn-ghost',
  outline: 'ui-btn-secondary',
};

/** Print page setup. The nested table print shell is hidden — this page header brands the print. */
const PRINT_PAGE_STYLE = `
  @page { size: A4 landscape; margin: 10mm; }
  html, body { background: #fff !important; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .no-print { display: none !important; }
  .print-only { display: block !important; }
  .pw-print-root, .pw-print-root * { max-height: none !important; }
  .pw-print-root, .pw-print-root section, .pw-print-root .overflow-auto, .pw-print-root .overflow-y-auto,
  .pw-print-root .overflow-x-auto, .pw-print-root .overflow-hidden { overflow: visible !important; height: auto !important; }
  .pw-printing .print-container > .fixed, .pw-printing .print-header-space, .pw-printing .print-footer-space { display: none !important; }
`;

/** Icon-only button inside the dark page toolbar; the label shows on hover. */
function ToolbarButton({
  icon,
  label,
  onClick,
  disabled,
  accent,
  tipLeft,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  accent?: 'refresh' | 'print' | 'pdf' | 'back';
  /** Anchor the hover label to the right edge (last button in the row). */
  tipLeft?: boolean;
  className?: string;
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      data-tip={label}
      data-accent={accent}
      data-tip-side={tipLeft ? 'left' : undefined}
      className={cn('ui-toolbar-btn', className)}
    >
      {icon}
    </button>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

const PageWrapper = ({
  title,
  subtitle,
  titleIcon,
  showInput,
  filterContent,
  showBackButton,
  onBack,
  backHref,
  backLabel = 'Back',
  showRefreshButton,
  onRefresh,
  isRefreshing,
  showPdfButton,
  showPrintButton = false,
  onPrint,
  actions,
  isLoading,
  isSuccess,
  isEmpty,
  isError,
  error,
  isUninitialized,
  children,
  stickyContent,
  className,
  contentClassName,
  noCard = false,
}: PageWrapperProps) => {
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);
  const [busyRefreshing, setBusyRefreshing] = useState(false);
  const [printedAt, setPrintedAt] = useState<Date | null>(null);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<Record<string, unknown> | null>(null);

  const refreshing = isRefreshing ?? busyRefreshing;
  const activePage = useActivePage();

  // Tables register themselves → their toolbar handles print & download
  const [tableCount, setTableCount] = useState(0);
  const registerTable = useCallback(() => {
    setTableCount((c) => c + 1);
    return () => setTableCount((c) => c - 1);
  }, []);
  const pageContext = useMemo(() => ({ registerTable }), [registerTable]);
  const hasTable = tableCount > 0;
  // One button (print → the browser can also save it as PDF), only on pages that ask for it and have no table
  const printVisible = (showPrintButton || Boolean(showPdfButton)) && !hasTable;
  const PageIcon = activePage.icon ?? LayoutGrid;

  // ── Back: custom handler → history → fallback route ─────────────────────
  const handleBack = () => {
    if (onBack) return onBack();
    if (typeof window !== 'undefined' && window.history.length > 1) return router.back();
    router.push(backHref || REDIRECT_PATH_AFTER_LOGIN || '/dashboard');
  };

  // ── Refresh: awaits the caller's promise, spins at least 500 ms ─────────
  const handleRefresh = async () => {
    if (refreshing) return;
    setBusyRefreshing(true);
    const started = Date.now();
    try {
      if (onRefresh) await onRefresh();
      else router.refresh();
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setTimeout(() => setBusyRefreshing(false), Math.max(0, 500 - (Date.now() - started)));
    }
  };

  // ── Print: page content with brand header/footer ────────────────────────
  const reactToPrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${title || PRINT_TITLE} - ${format(new Date(), 'dd-MM-yyyy')}`,
    bodyClass: 'pw-printing',
    pageStyle: PRINT_PAGE_STYLE,
  });
  const handlePrint = () => {
    if (onPrint) return onPrint();
    setPrintedAt(new Date());
    // let React paint the timestamp before the page is cloned for print
    requestAnimationFrame(() => reactToPrint());
  };

  const hasToolbar =
    (showInput && filterContent) ||
    showRefreshButton ||
    printVisible ||
    showBackButton ||
    (actions && actions.length > 0);
  const hasMainTools = (showInput && filterContent) || showRefreshButton || printVisible;

  return (
    <div ref={printRef} className={cn('pw-print-root print-area flex h-full flex-col overflow-hidden', className)}>
      {/* ── Print-only brand header ─────────────────────────────────── */}
      <div className='print-only mb-4'>
        <div className='flex items-center justify-between gap-4 rounded-lg bg-[#141414] px-5 py-3 text-white'>
          <div className='flex items-center gap-3'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BRAND.logo.print} alt={BRAND.logo.alt} className='h-10 w-auto object-contain' />
            <div>
              <p className='text-lg font-bold tracking-wide'>{BRAND.company.name}</p>
              <p className='text-[10px] uppercase tracking-[0.14em] text-white/60'>{PRINT_TITLE}</p>
            </div>
          </div>
          <div className='text-right'>
            <p className='text-base font-bold'>{title}</p>
            {subtitle && <p className='text-[11px] text-white/70'>{subtitle}</p>}
            <p className='text-[10px] text-white/60'>
              Printed {printedAt ? format(printedAt, 'd MMM yyyy, hh:mm a') : ''}
            </p>
          </div>
        </div>
      </div>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className='no-print mb-3 mt-1 flex min-h-[36px] items-center justify-between'>
        {/* LEFT — icon · title · subtitle */}
        <div className='flex min-w-0 items-center gap-2'>
          <span className='shrink-0 text-default-bg [&_svg]:h-6 [&_svg]:w-6'>{titleIcon ?? <PageIcon />}</span>
          <div className='min-w-0'>
            <h1 className='truncate text-xl font-bold leading-tight text-default-bg'>{title}</h1>
            {subtitle && <p className='mt-0.5 truncate text-xs text-gray-400'>{subtitle}</p>}
            {selectedFilters && (
              <div className='mt-2 flex flex-wrap gap-1.5'>
                {Object.entries(selectedFilters).map(([key, value]) =>
                  value ? (
                    <span key={key} className='ui-chip'>
                      {key.replace(/([A-Z])/g, ' $1')}: {String(value)}
                    </span>
                  ) : null,
                )}
                <button
                  type='button'
                  onClick={() => setSelectedFilters(null)}
                  className='ui-btn ui-btn-ghost ui-btn-sm'
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>

        {hasToolbar && (
          <div className='ml-4 flex shrink-0 items-center gap-2'>
            {actions?.map((action, idx) => (
              <button
                key={idx}
                type='button'
                onClick={action.onClick}
                disabled={action.disabled || action.loading}
                data-tip={action.title}
                className={cn(
                  'ui-btn ui-btn-sm',
                  ACTION_VARIANT_CLASS[action.variant ?? 'secondary'],
                  action.className,
                )}
              >
                {action.loading ? <Loader2 className='animate-spin' /> : action.icon}
                {action.label}
              </button>
            ))}

            <div className='ui-toolbar' role='toolbar' aria-label='Page actions'>
              {showInput && filterContent && (
                <ToolbarButton icon={<SlidersHorizontal />} label='Filters' onClick={() => setShowFilterDialog(true)} />
              )}
              {showRefreshButton && (
                <ToolbarButton
                  icon={<RotateCcw className={cn(refreshing && 'animate-spin')} />}
                  label={refreshing ? 'Refreshing…' : 'Refresh'}
                  accent='refresh'
                  onClick={handleRefresh}
                  disabled={refreshing}
                />
              )}
              {printVisible && (
                <ToolbarButton icon={<Printer />} label='Print / Save as PDF' accent='print' onClick={handlePrint} />
              )}
              {showBackButton && hasMainTools && <span className='ui-toolbar-sep' />}
              {showBackButton && (
                <ToolbarButton icon={<ArrowLeft />} label={backLabel} accent='back' tipLeft onClick={handleBack} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Body ────────────────────────────────────────────────────── */}
      <PageWrapperContext.Provider value={pageContext}>
        <section className='h-full min-h-0 flex-1 overflow-auto'>
          {stickyContent && <div className='sticky top-0 z-20 bg-transparent'>{stickyContent}</div>}

          {noCard ? (
            <div className='min-h-0 flex-1'>
              {children}
            </div>
          ) : (
            <div
              className={cn(
                'relative min-h-full flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-xs [&::-webkit-scrollbar]:hidden',
                contentClassName,
              )}
            >
              <ApiStatusHandler
                isLoading={isLoading}
                isUninitialized={isUninitialized}
                isSuccess={isSuccess}
                isError={isError}
                isEmpty={isEmpty}
                onRetry={onRefresh ? () => void onRefresh() : undefined}
                error={error}
              >
                {children}
              </ApiStatusHandler>
            </div>
          )}
        </section>
      </PageWrapperContext.Provider>

      {/* ── Print-only footer ───────────────────────────────────────── */}
      <div className='print-only mt-4 border-t border-slate-300 pt-2'>
        <div className='flex justify-between text-[9px] text-slate-500'>
          <span>{COPYRIGHT_TEXT}</span>
          <span>{printedAt ? format(printedAt, 'd MMM yyyy, hh:mm a') : ''}</span>
        </div>
      </div>

      {/* Filters dialog (showInput + filterContent) */}
      {showInput && filterContent && (
        <DialogComponent
          showDialog={showFilterDialog}
          setShowDialog={setShowFilterDialog}
          placement='side'
          size='lg'
          title='Filters'
        >
          {React.cloneElement(
            filterContent as React.ReactElement<{ onSubmit?: (d: Record<string, unknown>) => void }>,
            {
              onSubmit: (data: Record<string, unknown>) => {
                setSelectedFilters(data);
                setShowFilterDialog(false);
              },
            },
          )}
        </DialogComponent>
      )}
    </div>
  );
};

export default PageWrapper;
