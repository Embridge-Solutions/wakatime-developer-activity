"use client";

import {
  format,
  startOfDay,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
} from "date-fns";
import * as React from "react";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/modern-ui/button";
import { Calendar } from "@/components/modern-ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/modern-ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";

export interface DateRangePickerProps {
  dateRange?: { from?: Date | string; to?: Date | string } | DateRange;
  setDateRange?: (dateRange: DateRange | undefined) => void;
  className?: string;
  placeholder?: string;
  numberOfMonths?: number;
  label?: string;
}

export function DateRangePicker({
  dateRange,
  setDateRange,
  className,
  placeholder = "Pick a date range",
  numberOfMonths = 2,
  label,
}: DateRangePickerProps) {
  const [_dateRange, _setDateRange] = React.useState<DateRange | undefined>(() => {
    if (!dateRange) return undefined;
    const from = dateRange.from ? new Date(dateRange.from) : undefined;
    const to = dateRange.to ? new Date(dateRange.to) : undefined;
    return {
      from: from && !isNaN(from.getTime()) ? from : undefined,
      to: to && !isNaN(to.getTime()) ? to : undefined,
    };
  });

  const selectedDateRange = React.useMemo<DateRange | undefined>(() => {
    const raw = dateRange !== undefined ? dateRange : _dateRange;
    if (!raw) return undefined;
    const from = raw.from ? (raw.from instanceof Date ? raw.from : new Date(raw.from)) : undefined;
    const to = raw.to ? (raw.to instanceof Date ? raw.to : new Date(raw.to)) : undefined;
    return {
      from: from && !isNaN(from.getTime()) ? from : undefined,
      to: to && !isNaN(to.getTime()) ? to : undefined,
    };
  }, [dateRange, _dateRange]);

  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (dateRange) {
      const from = dateRange.from ? new Date(dateRange.from) : undefined;
      const to = dateRange.to ? new Date(dateRange.to) : undefined;
      _setDateRange({
        from: from && !isNaN(from.getTime()) ? from : undefined,
        to: to && !isNaN(to.getTime()) ? to : undefined,
      });
    } else {
      _setDateRange(undefined);
    }
  }, [dateRange]);

  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (setDateRange) setDateRange(range);
    _setDateRange(range);
  };

  const presets = React.useMemo(() => {
    const today = startOfDay(new Date());
    return [
      {
        label: "Today",
        value: { from: today, to: today },
      },
      {
        label: "Yesterday",
        value: { from: subDays(today, 1), to: subDays(today, 1) },
      },
      {
        label: "Last 7 Days",
        value: { from: subDays(today, 6), to: today },
      },
      {
        label: "Last 30 Days",
        value: { from: subDays(today, 29), to: today },
      },
      {
        label: "This Month",
        value: { from: startOfMonth(today), to: today },
      },
      {
        label: "Last Month",
        value: {
          from: startOfMonth(subMonths(today, 1)),
          to: endOfMonth(subMonths(today, 1)),
        },
      },
    ];
  }, []);

  const handlePresetSelect = (range: DateRange) => {
    if (setDateRange) setDateRange(range);
    _setDateRange(range);
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
          {label}
        </label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "flex h-9 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all",
              !selectedDateRange?.from && "text-slate-400",
              className,
            )}
          >
            <div className="flex items-center gap-2 truncate">
              <CalendarIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="truncate">
                {selectedDateRange?.from ? (
                  selectedDateRange.to ? (
                    <>
                      {format(selectedDateRange.from, "dd-MM-yyyy")} -{" "}
                      {format(selectedDateRange.to, "dd-MM-yyyy")}
                    </>
                  ) : (
                    format(selectedDateRange.from, "dd-MM-yyyy")
                  )
                ) : (
                  placeholder
                )}
              </span>
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 border border-slate-200 bg-white shadow-xl rounded-xl overflow-hidden animate-in zoom-in-95 duration-150 z-50"
          align="start"
        >
          <div className="flex h-auto">
            {/* Presets Sidebar */}
            <div className="w-36 border-r border-slate-100 bg-slate-50/70 p-3 space-y-1 flex flex-col justify-start">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">
                Quick Select
              </div>
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs h-7.5 px-2 font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-md transition-colors"
                  onClick={() => handlePresetSelect(preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            {/* Calendar Area */}
            <div className="flex flex-col bg-white">
              <Calendar
                mode="range"
                selected={selectedDateRange}
                onSelect={handleDateRangeChange}
                numberOfMonths={numberOfMonths}
                initialView="days"
                autoFocus
                className="p-3"
              />
              <div className="p-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 mt-auto">
                <div className="text-[10px] text-slate-400 px-2 font-medium italic">
                  {selectedDateRange?.from && selectedDateRange?.to
                    ? `${format(selectedDateRange.from, "dd-MM-yy")} - ${format(selectedDateRange.to, "dd-MM-yy")}`
                    : "Selection pending..."}
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setOpen(false)}
                  className="rounded-lg h-7.5 px-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
