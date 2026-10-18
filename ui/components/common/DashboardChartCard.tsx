'use client';

import React, { useRef, useState } from 'react';
import { Info, Maximize2, Download, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { exportElementAsPng } from '@/lib/exportImage';

export interface DashboardChartCardProps {
  title: string;
  infoTooltip?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  enableExpand?: boolean;
  enableDownload?: boolean;
  isExpanded?: boolean;
  onExpandChange?: (open: boolean) => void;
  customExpandContent?: React.ReactNode;
  expandModalClassName?: string;
}

export const DashboardChartCard: React.FC<DashboardChartCardProps> = ({
  title,
  infoTooltip,
  headerRight,
  children,
  footer,
  className,
  contentClassName,
  enableExpand = true,
  enableDownload = true,
  isExpanded,
  onExpandChange,
  customExpandContent,
  expandModalClassName,
}) => {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const modalBodyRef = useRef<HTMLDivElement>(null);

  const open = isExpanded !== undefined ? isExpanded : internalExpanded;

  const setOpen = (val: boolean) => {
    if (onExpandChange) {
      onExpandChange(val);
    }
    setInternalExpanded(val);
  };

  const handleDownloadImage = async (target: 'card' | 'modal') => {
    const el = target === 'modal' ? modalBodyRef.current : cardRef.current;
    if (!el || isDownloading) return;
    try {
      setIsDownloading(true);
      const sanitizedTitle = (title || 'chart').toLowerCase().replace(/[^a-z0-9]+/g, '_');
      const dateStr = new Date().toISOString().slice(0, 10);
      await exportElementAsPng(el, `${sanitizedTitle}_${dateStr}.png`);
    } catch (err) {
      console.error('Failed to export chart image:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <div
        ref={cardRef}
        className={cn(
          'flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white via-white to-slate-50/30 p-4.5 shadow-xs transition hover:border-slate-300 hover:shadow-sm',
          className,
        )}
      >
        {/* Card Header */}
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold text-slate-800">{title}</h3>
            {infoTooltip && (
              <span title={infoTooltip}>
                <Info className="h-3.5 w-3.5 cursor-help text-slate-400" />
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5" data-html2canvas-ignore="true">
            {headerRight}
            {enableDownload && (
              <button
                type="button"
                onClick={() => handleDownloadImage('card')}
                disabled={isDownloading}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 shadow-2xs hover:border-slate-300 hover:bg-slate-50 hover:text-emerald-700 transition cursor-pointer disabled:opacity-50"
                title="Download PNG"
              >
                {isDownloading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                ) : (
                  <Download className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-600" />
                )}
                <span className="hidden sm:inline">PNG</span>
              </button>
            )}
            {enableExpand && (
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600 shadow-2xs hover:border-slate-300 hover:bg-slate-50 hover:text-emerald-700 transition cursor-pointer"
                title="Expand View"
              >
                <Maximize2 className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-600" />
                <span className="hidden sm:inline">Expand</span>
              </button>
            )}
          </div>
        </div>

        {/* Chart Body */}
        <div className={cn('w-full', contentClassName)}>{children}</div>

        {/* Card Footer */}
        {footer && <div className="border-t border-slate-100 pt-2 text-[11px]">{footer}</div>}
      </div>

      {/* Expanded Modal Dialog */}
      {enableExpand && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            showCloseButton={false}
            className={cn(
              'sm:max-w-6xl w-[96vw] max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-2xl z-50',
              expandModalClassName,
            )}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3.5 bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-xs">
                  <Maximize2 className="h-4.5 w-4.5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-slate-900">{title}</DialogTitle>
                  {infoTooltip ? (
                    <DialogDescription className="text-xs text-slate-500 mt-0.5">
                      {infoTooltip}
                    </DialogDescription>
                  ) : (
                    <DialogDescription className="text-xs text-slate-500 mt-0.5">
                      Expanded full view
                    </DialogDescription>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {headerRight}
                {enableDownload && (
                  <button
                    type="button"
                    onClick={() => handleDownloadImage('modal')}
                    disabled={isDownloading}
                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-emerald-700 transition cursor-pointer shadow-xs disabled:opacity-50"
                    title="Download PNG"
                  >
                    {isDownloading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                    ) : (
                      <Download className="h-3.5 w-3.5 text-slate-500" />
                    )}
                    <span>Download PNG</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer shadow-xs"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div ref={modalBodyRef} className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-50/20">
              {customExpandContent ? (
                customExpandContent
              ) : (
                <div className="h-[520px] w-full min-h-[400px] flex flex-col justify-center">
                  {children}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {footer && (
              <div className="border-t border-slate-200 px-6 py-3 bg-white text-xs shrink-0">
                {footer}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default DashboardChartCard;
