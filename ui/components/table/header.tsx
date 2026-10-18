"use client";

import React from "react";
import {
  Search,
  SlidersHorizontal,
  Download,
  Printer,
  Columns3,
  Trash2,
  Plus,
  X,
  FileSpreadsheet,
  FileText,
  FileDown,
  Check,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import DialogComponent from "@/components/layout/dialogComponent";

// ─── Types (re-exported for index.tsx) ────────────────────────────────────────

export interface TableColumn<T = any> {
  key: keyof T;
  label: string;
  render?: (value: any, row: T) => React.ReactNode;
  display?: string | undefined;
}

export interface TableHeaderProps<T = any> {
  columns: TableColumn<T>[];

  // Search
  showSearch?: boolean;
  searchValue: string;
  onSearchChange: (value: string) => void;

  // Filter
  showFilter?: boolean;
  columnFilters: Record<string, string>;
  onColumnFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;

  // Column visibility
  visibleColumns: string[];
  onColumnToggle: (key: string) => void;
  onShowAllColumns?: () => void;

  // Toolbar buttons
  showExport?: boolean;
  /** Excel download */
  onExport?: () => void;
  /** When given, Download becomes a menu: Excel · CSV · PDF */
  onExportCsv?: () => void;
  onExportPdf?: () => void;
  showPrint?: boolean;
  onPrint?: () => void;

  // Add button
  showAddButton?: boolean;
  addButtonLabel?: string;
  onAdd?: () => void;

  // Bulk delete badge
  selectedCount: number;
  onDeleteSelected: () => void;
  showBulkDelete?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

/** Table toolbar — styles come from globals.css (.ui-btn, .ui-menu, .ui-input…). */
export function TableHeader<T = any>({
  columns,
  showSearch = false,
  searchValue,
  onSearchChange,
  showFilter = false,
  columnFilters,
  onColumnFilterChange,
  onClearFilters,
  visibleColumns,
  onColumnToggle,
  onShowAllColumns,
  showExport = false,
  onExport,
  onExportCsv,
  onExportPdf,
  showPrint = false,
  onPrint,
  showAddButton = false,
  addButtonLabel = "Add",
  onAdd,
  selectedCount,
  onDeleteSelected,
  showBulkDelete = false,
}: TableHeaderProps<T>) {
  const [showFilterPanel, setShowFilterPanel] = React.useState(false);

  const activeFilters = Object.entries(columnFilters).filter(([, v]) => v);
  const labelOf = (key: string) => columns.find((c) => String(c.key) === key)?.label ?? key;
  const hiddenCount = columns.length - columns.filter((c) => visibleColumns.includes(c.key as string)).length;
  const hasDownloadMenu = Boolean(onExportCsv || onExportPdf);

  return (
    <div className="no-print border-b border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        {/* LEFT — search + bulk delete */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {showSearch && (
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search in table…"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="ui-input h-9 w-full pl-9 pr-8 text-[13px]"
              />
              {searchValue && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => onSearchChange("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
          {showBulkDelete && selectedCount > 0 && (
            <button type="button" onClick={onDeleteSelected} className="ui-btn ui-btn-sm ui-btn-danger shrink-0">
              <Trash2 />
              Delete {selectedCount} selected
            </button>
          )}
        </div>

        {/* RIGHT — icon actions (labels on hover) */}
        <div className="flex shrink-0 items-center gap-1.5">
          {showFilter && (
            <button
              type="button"
              onClick={() => setShowFilterPanel(true)}
              aria-label="Filters"
              data-tip="Filters"
              className="ui-btn ui-btn-secondary ui-btn-icon h-9 w-9"
            >
              <SlidersHorizontal />
              {activeFilters.length > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--action)] px-1 text-[10px] font-bold text-white">
                  {activeFilters.length}
                </span>
              )}
            </button>
          )}

          {/* Columns */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Columns"
                data-tip={hiddenCount > 0 ? `Columns (${hiddenCount} hidden)` : "Columns"}
                className="ui-btn ui-btn-secondary ui-btn-icon h-9 w-9"
              >
                <Columns3 />
                {hiddenCount > 0 && (
                  <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-[var(--color-status-idle)]" />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={6}
              className="ui-menu w-64 rounded-xl border-slate-200 p-0 shadow-[0_12px_32px_-8px_rgb(20_20_20/0.18)]"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Columns</span>
                {onShowAllColumns && hiddenCount > 0 && (
                  <button
                    type="button"
                    onClick={onShowAllColumns}
                    className="text-xs font-semibold text-[var(--action)] hover:underline"
                  >
                    Show all
                  </button>
                )}
              </div>
              <div className="ui-menu-list">
                {columns.map((col) => {
                  const on = visibleColumns.includes(col.key as string);
                  return (
                    <button
                      key={String(col.key)}
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={on}
                      onClick={() => onColumnToggle(col.key as string)}
                      className="ui-menu-item"
                    >
                      <span className="ui-check" data-checked={on}>
                        {on && <Check />}
                      </span>
                      {col.label}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>

          {/* Download */}
          {showExport &&
            (hasDownloadMenu ? (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="Download"
                    data-tip="Download"
                    className="ui-btn ui-btn-secondary ui-btn-icon h-9 w-9"
                  >
                    <Download />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  sideOffset={6}
                  className="ui-menu w-56 rounded-xl border-slate-200 p-0 shadow-[0_12px_32px_-8px_rgb(20_20_20/0.18)]"
                >
                  <div className="ui-menu-list">
                    {onExport && (
                      <button type="button" onClick={onExport} className="ui-menu-item">
                        <FileSpreadsheet className="h-4 w-4 text-[var(--color-status-running)]" />
                        Excel <span className="ml-auto text-xs font-normal text-slate-400">.xlsx</span>
                      </button>
                    )}
                    {onExportCsv && (
                      <button type="button" onClick={onExportCsv} className="ui-menu-item">
                        <FileText className="h-4 w-4 text-slate-500" />
                        CSV <span className="ml-auto text-xs font-normal text-slate-400">.csv</span>
                      </button>
                    )}
                    {onExportPdf && (
                      <button type="button" onClick={onExportPdf} className="ui-menu-item">
                        <FileDown className="h-4 w-4 text-[var(--color-status-down)]" />
                        PDF <span className="ml-auto text-xs font-normal text-slate-400">.pdf</span>
                      </button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <button
                type="button"
                onClick={onExport}
                aria-label="Download Excel"
                data-tip="Download Excel"
                className="ui-btn ui-btn-secondary ui-btn-icon h-9 w-9"
              >
                <Download />
              </button>
            ))}

          {showPrint && (
            <button
              type="button"
              onClick={onPrint}
              aria-label="Print"
              data-tip="Print"
              data-tip-side={showAddButton ? undefined : "left"}
              className="ui-btn ui-btn-secondary ui-btn-icon h-9 w-9"
            >
              <Printer />
            </button>
          )}

          {showAddButton && <span className="mx-1 h-5 w-px bg-slate-200" />}
          {showAddButton && (
            <button type="button" onClick={onAdd} className="ui-btn ui-btn-primary ui-btn-sm h-9">
              <Plus />
              {addButtonLabel}
            </button>
          )}
        </div>
      </div>

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 bg-slate-50/60 px-4 py-2">
          <span className="mr-1 text-xs text-slate-500">Filtered by</span>
          {activeFilters.map(([key, value]) => (
            <span key={key} className="ui-chip">
              {labelOf(key)}: <b className="font-semibold">{value}</b>
              <button
                type="button"
                aria-label={`Remove ${labelOf(key)} filter`}
                onClick={() => onColumnFilterChange(key, "")}
                className="rounded p-0.5 hover:bg-black/5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={onClearFilters}
            className="ml-1 text-xs font-semibold text-[var(--action)] hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Filter panel */}
      {showFilter && (
        <DialogComponent
          showDialog={showFilterPanel}
          setShowDialog={setShowFilterPanel}
          placement="side"
          size="md"
          icon={<SlidersHorizontal className="h-[18px] w-[18px]" />}
          title="Filter columns"
          description="Rows update as you type."
          footerActions={[
            { label: "Clear all", variant: "ghost", onClick: onClearFilters, disabled: activeFilters.length === 0 },
            { label: "Done", icon: <Check />, onClick: () => setShowFilterPanel(false) },
          ]}
        >
          <div className="space-y-4">
            {columns.map((col) => (
              <div key={String(col.key)} className="ui-field">
                <label htmlFor={`tf-${String(col.key)}`} className="ui-label">
                  {col.label}
                </label>
                <input
                  id={`tf-${String(col.key)}`}
                  type="text"
                  value={columnFilters[col.key as string] || ""}
                  onChange={(e) => onColumnFilterChange(col.key as string, e.target.value)}
                  placeholder={`Contains…`}
                  className="ui-input"
                />
              </div>
            ))}
          </div>
        </DialogComponent>
      )}
    </div>
  );
}
