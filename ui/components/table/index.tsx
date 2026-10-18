"use client";

import React, { useState, useEffect } from "react";
import {
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
} from "lucide-react";
import { format } from "date-fns";
import { TableHeader, TableColumn } from "./header";
import { useRegisterTable } from "../layout/page-context";
import { showAlert } from "../common/AlertHandler";
import { BRAND, COPYRIGHT_TEXT } from "@/config/brand.config";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { TableNoData } from "../animation-ui/table-no-data";
import { EmptyData } from "../animation-ui/emptyData";
import { useSearch } from "@/contexts/search-context";
import { SearchHighlight } from "../common/search-highlight";
import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import PrintLayout from "../layout/print-layout";
import { cn } from "@/lib/utils";

// ─── Columns ──────────────────────────────────────────────────────────────────
export type { TableColumn };

// ─── Props ────────────────────────────────────────────────────────────────────

export interface TableProps<T extends Record<string, any>> {
  /** Row data */
  data: T[];
  /** Column definitions */
  columns: TableColumn<T>[];
  /** The field used as the unique row key */
  rowIdKey: keyof T;

  // ── Toolbar ─────────────────────────────────────────────────────────────
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;

  showFilter?: boolean;

  showExport?: boolean;
  onExport?: () => void;
  fileName?: string;
  sheetName?: string;

  showPrint?: boolean;
  onPrint?: () => void;

  showAddButton?: boolean;
  addButtonLabel?: string;
  /** Called when the Add button is clicked — open your own dialog here */
  onAdd?: () => void;
  // ── Row actions ─────────────────────────────────────────────────────────
  /** Called with the row when Edit is clicked — open your own dialog here */
  onEdit?: (row: T) => void;
  /** Called with the row when Delete is clicked */
  onDelete?: (row: T) => void;
  /** Hide the Edit button */
  showEditButton?: boolean;
  /** Hide the Delete button */
  showDeleteButton?: boolean;
  /** Render extra custom action buttons per row */
  rowActions?: (row: T) => React.ReactNode;
  /** Master switch — set to false to hide the entire Actions column (overrides showEditButton, showDeleteButton, and rowActions) */
  showActionsColumn?: boolean;
  showBulkDelete?: boolean;
  onBulkDelete?: (ids: (string | number)[]) => void;
  showRowSelection?: boolean;

  // ── Pagination ───────────────────────────────────────────────────────────
  showPagination?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];

  /** Optional arbitrary content to render between toolbar and table body (e.g. FilterSection) */
  filterSection?: React.ReactNode;
  /** Title for the print layout */
  title?: string;
  /** Subtitle for the print layout */
  subtitle?: string;
  /** Custom company name for the print header */
  companyName?: string;
  /** Custom logo path for the print header */
  logoPath?: string;
  /** Whether to show the watermark in the print report */
  showWatermark?: boolean;
  /** Custom watermark image path */
  watermarkPath?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildPageNumbers(currentPage: number, totalPages: number): (number | string)[] {
  const pages: (number | string)[] = [];
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else if (currentPage <= 3) {
    pages.push(1, 2, 3, 4, "...", totalPages);
  } else if (currentPage >= totalPages - 2) {
    pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
  } else {
    pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
  }
  return pages;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Table<T extends Record<string, any>>({
  data,
  columns,
  rowIdKey,
  // Toolbar
  showSearch = false,
  searchValue = "",
  onSearchChange,
  showFilter = false,
  showExport = false,
  onExport,
  fileName,
  sheetName,
  showPrint = false,
  onPrint,
  showAddButton = false,
  addButtonLabel = "Add",
  onAdd,
  // Row actions
  onEdit,
  onDelete,
  showEditButton = false,
  showDeleteButton = false,
  rowActions,
  showActionsColumn = true,
  // Pagination
  showPagination = false,
  pageSize = 10,
  pageSizeOptions = [5, 10, 25, 50],
  showBulkDelete = false,
  onBulkDelete,
  showRowSelection = false,
  filterSection,
  title = "",
  subtitle = "",
  companyName,
  logoPath,
  showWatermark,
  watermarkPath,
}: TableProps<T>) {
  // ── State ──────────────────────────────────────────────────────────────────
  const printRef = useRef<HTMLDivElement>(null);
  useRegisterTable(); // page hides its own Print/PDF — this toolbar handles them

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: title || fileName || "Emission Report",
  });
  const [tableData, setTableData] = useState<T[]>(data?.length > 0 ? data : []);
  const [selectedRows, setSelectedRows] = useState<(string | number)[]>([]);
  const [visibleCols, setVisibleCols] = useState<string[]>(
    columns.filter((c) => String(c.display) !== "excluded").map((c) => c.key as string),
  );
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(pageSize);

  const { searchQuery: globalSearchQuery, setSearchQuery: setGlobalSearchQuery } = useSearch();
  const [internalSearch, setInternalSearch] = useState("");

  // Use global search value if showSearch is true, otherwise fallback to local props or internal state
  const activeSearchValue = showSearch
    ? globalSearchQuery || searchValue || internalSearch
    : onSearchChange
      ? searchValue
      : internalSearch;

  const handleSearchChange = onSearchChange ?? setInternalSearch;

  // Sync external data changes
  useEffect(() => setTableData(data), [data]);
  // Reset page when search changes
  useEffect(() => setCurrentPage(1), [activeSearchValue]);

  // ── Derived ────────────────────────────────────────────────────────────────

  // 1. External search filter
  const afterSearch = tableData?.filter((row) =>
    Object.values(row).join(" ").toLowerCase().includes(activeSearchValue.toLowerCase()),
  );

  // 2. Column-level filter
  const filtered = afterSearch?.filter((row) =>
    Object.entries(colFilters).every(
      ([key, val]) =>
        !val ||
        String(row[key] ?? "")
          .toLowerCase()
          .includes(val.toLowerCase()),
    ),
  );

  // 3. Sort (click a header: asc → desc → off)
  const sorted = sort
    ? [...(filtered ?? [])].sort((a, b) => {
        const av = a[sort.key];
        const bv = b[sort.key];
        if (av == null || av === "") return 1;
        if (bv == null || bv === "") return -1;
        const cmp =
          typeof av === "number" && typeof bv === "number"
            ? av - bv
            : String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" });
        return sort.dir === "asc" ? cmp : -cmp;
      })
    : filtered;

  const toggleSort = (key: string) =>
    setSort((prev) =>
      !prev || prev.key !== key ? { key, dir: "asc" } : prev.dir === "asc" ? { key, dir: "desc" } : null,
    );

  const totalPages = Math.max(1, Math.ceil(filtered?.length / rowsPerPage));
  const paginated = showPagination ? sorted?.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage) : sorted;

  const allSelected = selectedRows?.length === tableData?.length && tableData?.length > 0;
  const activeCols = columns?.filter((c) => visibleCols?.includes(c.key as string));
  const showActionsCol = showActionsColumn && (showEditButton || showDeleteButton || !!rowActions);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleDeleteRow = (row: T) => {
    if (onDelete) {
      onDelete(row);
    } else {
      if (!window.confirm("Delete this row?")) return;
      setTableData((prev) => prev.filter((r) => r[rowIdKey] !== row[rowIdKey]));
    }
  };

  const handleDeleteSelected = () => {
    if (!selectedRows?.length) return;
    if (!window.confirm(`Delete ${selectedRows?.length} selected row(s)?`)) return;
    setTableData((prev) => prev.filter((r) => !selectedRows?.includes(r[rowIdKey] as any)));
    setSelectedRows([]);
  };
  const handleBulkDelete = () => {
    if (onBulkDelete) {
      onBulkDelete(selectedRows);
    }
    setSelectedRows([]);
  };

  const toggleRow = (id: string | number) =>
    setSelectedRows((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleAll = () => setSelectedRows(allSelected ? [] : tableData?.map((r) => r[rowIdKey] as string | number));

  const goTo = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  // ── Exports (Excel · CSV · PDF) — visible columns, current filters & sort ──
  const exportName = fileName || title || "table";

  const cellText = (v: unknown): string => {
    if (v == null) return "";
    if (Array.isArray(v)) return v.map(cellText).join(", ");
    if (typeof v === "object") return "";
    return String(v);
  };

  const buildExportRows = () =>
    (sorted ?? []).map((row, index) => {
      const obj: Record<string, string | number> = { "S.No": index + 1 };
      activeCols.forEach((col) => {
        obj[col.label] = cellText(row[col.key]);
      });
      return obj;
    });

  const noDataAlert = () => showAlert({ status: "warning", message: "No rows to download" });

  const handleExport = () => {
    const rows = buildExportRows();
    if (!rows.length) return noDataAlert();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, (sheetName || "Sheet1").slice(0, 31));
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8" }),
      `${exportName}.xlsx`,
    );
  };

  const handleExportCsv = () => {
    const rows = buildExportRows();
    if (!rows.length) return noDataAlert();
    const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(rows));
    saveAs(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }), `${exportName}.csv`);
  };

  const handleExportPdf = async () => {
    const rows = buildExportRows();
    if (!rows.length) return noDataAlert();
    const { default: jsPDF } = await import("jspdf/dist/jspdf.umd.min.js");
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 10;
    const headers = Object.keys(rows[0]);
    const snoW = 12;
    const colW = (W - 2 * M - snoW) / Math.max(1, headers.length - 1);
    const xOf = (i: number) => (i === 0 ? M : M + snoW + (i - 1) * colW);
    const widthOf = (i: number) => (i === 0 ? snoW : colW);
    const fit = (text: string, max: number) => {
      if (doc.getTextWidth(text) <= max) return text;
      let t = text;
      while (t.length > 1 && doc.getTextWidth(t + "…") > max) t = t.slice(0, -1);
      return t + "…";
    };
    const printed = format(new Date(), "d MMM yyyy, hh:mm a");
    let y = 0;
    let page = 1;

    const pageHeader = () => {
      doc.setFillColor(20, 20, 20);
      doc.rect(0, 0, W, 16, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(`${BRAND.company.name} · ${title || fileName || "Report"}`, M, 10);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(printed, W - M, 10, { align: "right" });
      y = 24;
      doc.setFillColor(238, 238, 236);
      doc.rect(M, y - 5, W - 2 * M, 7.5, "F");
      doc.setTextColor(45, 45, 43);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      headers.forEach((h, i) => doc.text(fit(h, widthOf(i) - 3), xOf(i) + 1.5, y));
      doc.setFont("helvetica", "normal");
      y += 7;
    };
    const pageFooter = () => {
      doc.setTextColor(120, 120, 118);
      doc.setFontSize(7);
      doc.text(COPYRIGHT_TEXT, M, H - 6);
      doc.text(`Page ${page}`, W - M, H - 6, { align: "right" });
    };

    pageHeader();
    rows.forEach((row, r) => {
      if (y > H - 16) {
        pageFooter();
        doc.addPage();
        page += 1;
        pageHeader();
      }
      if (r % 2 === 1) {
        doc.setFillColor(247, 247, 246);
        doc.rect(M, y - 4.5, W - 2 * M, 6.5, "F");
      }
      doc.setTextColor(30, 30, 29);
      doc.setFontSize(7.5);
      headers.forEach((h, i) => doc.text(fit(String(row[h] ?? ""), widthOf(i) - 3), xOf(i) + 1.5, y));
      y += 6.5;
    });
    pageFooter();
    doc.save(`${exportName}.pdf`);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const colSpan = activeCols.length + 1 + (showActionsCol ? 1 : 0) + (showRowSelection ? 1 : 0);
  const pageBtn =
    "inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-40";

  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs print:h-auto print:overflow-visible print:border-0 print:shadow-none">
      {filterSection && <div className="no-print shrink-0 border-b border-slate-200 p-4">{filterSection}</div>}

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <TableHeader
        columns={columns?.filter((c) => String(c.display) !== "excluded")}
        showSearch={showSearch}
        searchValue={onSearchChange ? searchValue : internalSearch}
        onSearchChange={handleSearchChange}
        showFilter={showFilter}
        columnFilters={colFilters}
        onColumnFilterChange={(key, val) => setColFilters((prev) => ({ ...prev, [key]: val }))}
        onClearFilters={() => setColFilters({})}
        visibleColumns={visibleCols}
        onColumnToggle={(key) =>
          setVisibleCols((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
        }
        onShowAllColumns={() =>
          setVisibleCols(columns.filter((c) => String(c.display) !== "excluded").map((c) => c.key as string))
        }
        showExport={showExport}
        onExport={onExport ?? handleExport}
        onExportCsv={onExport ? undefined : handleExportCsv}
        onExportPdf={onExport ? undefined : handleExportPdf}
        showPrint={showPrint}
        onPrint={onPrint ?? handlePrint}
        showAddButton={showAddButton}
        addButtonLabel={addButtonLabel}
        onAdd={onAdd}
        selectedCount={selectedRows?.length}
        onDeleteSelected={showBulkDelete && onBulkDelete ? handleBulkDelete : handleDeleteSelected}
        showBulkDelete={showBulkDelete}
      />

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div ref={printRef} className="print-area w-full">
        <PrintLayout
          title={title || fileName || ""}
          subtitle={subtitle}
          companyName={companyName}
          logoPath={logoPath}
          showWatermark={showWatermark}
          watermarkPath={watermarkPath}
        >
          <div className="overflow-x-auto print:max-h-none print:overflow-visible">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50">
                <tr className="border-b border-slate-200">
                  {showRowSelection && (
                    <th className="no-print w-10 px-3 py-3 text-center">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all rows" />
                    </th>
                  )}

                  <th className="w-14 whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                    S.No
                  </th>

                  {activeCols.map((col) => {
                    const key = String(col.key);
                    const dir = sort?.key === key ? sort.dir : null;
                    return (
                      <th
                        key={key}
                        aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none"}
                        className="whitespace-nowrap px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500"
                      >
                        <button
                          type="button"
                          onClick={() => toggleSort(key)}
                          className={cn(
                            "group/sort -mx-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-1 uppercase transition-colors hover:bg-slate-100 hover:text-slate-900",
                            dir && "text-slate-900",
                          )}
                        >
                          {col.label}
                          {dir === "asc" ? (
                            <ArrowUp className="h-3.5 w-3.5 text-[var(--action)]" />
                          ) : dir === "desc" ? (
                            <ArrowDown className="h-3.5 w-3.5 text-[var(--action)]" />
                          ) : (
                            <ChevronsUpDown className="no-print h-3.5 w-3.5 opacity-0 transition-opacity group-hover/sort:opacity-60" />
                          )}
                        </button>
                      </th>
                    );
                  })}

                  {showActionsCol && (
                    <th className="no-print sticky right-0 z-20 w-24 bg-slate-50 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 shadow-[-6px_0_8px_-6px_rgb(20_20_20/0.12)]">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>

              <tbody>
                {paginated?.length === 0 ? (
                  <tr>
                    <td colSpan={colSpan} className="p-0">
                      {Number(tableData?.length) === 0 ? (
                        <EmptyData minimal className="min-h-[320px] border-none bg-white" />
                      ) : (
                        <TableNoData
                          onReset={() => {
                            setColFilters({});
                            handleSearchChange("");
                            setGlobalSearchQuery("");
                          }}
                          className="min-h-[320px] border-none bg-white"
                        />
                      )}
                    </td>
                  </tr>
                ) : (
                  paginated?.map((row, index) => {
                    const id = row[rowIdKey] as string | number;
                    const isRowSelected = selectedRows.includes(id);
                    return (
                      <tr
                        key={String(id)}
                        className={cn(
                          "group/row border-b border-slate-100 transition-colors last:border-b-0",
                          isRowSelected ? "selected-row bg-[var(--action-soft)]" : "hover:bg-slate-50",
                        )}
                      >
                        {showRowSelection && (
                          <td className="no-print px-3 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={isRowSelected}
                              onChange={() => toggleRow(id)}
                              aria-label="Select row"
                            />
                          </td>
                        )}

                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-400 tabular-nums">
                          {showPagination ? (currentPage - 1) * rowsPerPage + index + 1 : index + 1}
                        </td>

                        {activeCols.map((col) => (
                          <td
                            key={String(col.key)}
                            className="whitespace-nowrap px-4 py-3 text-[13.5px] text-slate-700"
                          >
                            {col.render ? (
                              col.render(row[col.key], row)
                            ) : (
                              <SearchHighlight text={String(row[col.key] ?? "—")} />
                            )}
                          </td>
                        ))}

                        {showActionsCol && (
                          <td
                            className={cn(
                              "no-print sticky right-0 z-10 px-3 py-2 hover:z-20 focus-within:z-20 shadow-[-6px_0_8px_-6px_rgb(20_20_20/0.12)] transition-colors",
                              isRowSelected ? "bg-[var(--action-soft)]" : "bg-white group-hover/row:bg-slate-50",
                            )}
                          >
                            <div className="flex items-center justify-center gap-1">
                              {rowActions && rowActions(row)}
                              {showEditButton && onEdit && (
                                <button
                                  type="button"
                                  data-tip="Edit"
                                  aria-label="Edit row"
                                  onClick={() => onEdit(row)}
                                  className="ui-btn ui-btn-secondary ui-btn-icon hover:border-[var(--action)] hover:text-[var(--action)]"
                                >
                                  <Pencil className="!h-3.5 !w-3.5" />
                                </button>
                              )}
                              {showDeleteButton && (
                                <button
                                  type="button"
                                  data-tip="Delete"
                                  aria-label="Delete row"
                                  onClick={() => handleDeleteRow(row)}
                                  className="ui-btn ui-btn-secondary ui-btn-icon hover:border-[var(--color-status-down)] hover:bg-red-50 hover:text-[var(--color-status-down)]"
                                >
                                  <Trash2 className="!h-3.5 !w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </PrintLayout>
      </div>

      {/* ── Footer: total entries + pagination ───────────────────────────── */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/60 px-4 py-2.5">
        <span className="text-xs text-slate-500">
          {showPagination && (filtered?.length ?? 0) > 0 ? (
            <>
              Showing{" "}
              <b className="font-semibold text-slate-800 tabular-nums">
                {(currentPage - 1) * rowsPerPage + 1}–{Math.min(currentPage * rowsPerPage, filtered.length)}
              </b>{" "}
              of{" "}
            </>
          ) : (
            "Total "
          )}
          <b className="font-semibold text-slate-800 tabular-nums">{filtered?.length ?? 0}</b>{" "}
          {(filtered?.length ?? 0) === 1 ? "entry" : "entries"}
          {(filtered?.length ?? 0) !== (tableData?.length ?? 0) && (
            <span className="text-slate-400"> (filtered from {tableData?.length ?? 0})</span>
          )}
        </span>

        {showPagination && (
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-slate-500">
              Rows per page
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 outline-none focus:border-[var(--action)]"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>

            <nav className="flex items-center gap-1" aria-label="Pagination">
              <button
                type="button"
                onClick={() => goTo(1)}
                disabled={currentPage === 1}
                className={pageBtn}
                aria-label="First page"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => goTo(currentPage - 1)}
                disabled={currentPage === 1}
                className={pageBtn}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              {buildPageNumbers(currentPage, totalPages).map((p, i) =>
                p === "..." ? (
                  <span key={`gap-${i}`} className="px-1 text-xs text-slate-400">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => goTo(p as number)}
                    aria-current={p === currentPage ? "page" : undefined}
                    className={cn(
                      pageBtn,
                      p === currentPage &&
                        "border-[var(--action)] bg-[var(--action)] font-semibold text-white hover:border-[var(--action)] hover:text-white",
                    )}
                  >
                    {p}
                  </button>
                ),
              )}
              <button
                type="button"
                onClick={() => goTo(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={pageBtn}
                aria-label="Next page"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => goTo(totalPages)}
                disabled={currentPage === totalPages}
                className={pageBtn}
                aria-label="Last page"
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </button>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
