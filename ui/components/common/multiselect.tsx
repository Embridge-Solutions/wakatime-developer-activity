"use client";

import { useState, useRef, useEffect } from "react";
import { X, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import * as Popover from "@radix-ui/react-popover";
import { motion, AnimatePresence } from "framer-motion";
import { Search } from "lucide-react";
import clsx from "clsx";

export interface MultiSelectProps {
    label: string;
    options: string[];
    selected: string[];
    onChange: (opt: string) => void;
    required?: boolean;
    placeholder?: string;
    className?: string;
    renderSelected?: (value: string) => React.ReactNode;
    renderOption?: (value: string) => React.ReactNode;
    getSearchLabel?: (value: string) => string;
    showSearch?: boolean;
    error?: string;
}

/**
 * A premium Mantine-style MultiSelect component with tag pills and a checkbox-based dropdown.
 * Uses Radix UI Popover with Portals to prevent clipping by parent containers.
 */
const MultiSelect = ({
    label,
    options,
    selected = [],
    onChange,
    required,
    placeholder = "Pick value",
    className,
    renderSelected,
    renderOption,
    getSearchLabel,
    showSearch,
    error,
}: MultiSelectProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const triggerRef = useRef<HTMLDivElement>(null);
    const [triggerWidth, setTriggerWidth] = useState<number | null>(null);

    // Update dropdown width to match input width
    useEffect(() => {
        if (triggerRef.current) {
            setTriggerWidth(triggerRef.current.offsetWidth);
        }
    }, [isOpen]);

    const toggleOption = (option: string) => {
        onChange(option);
    };

    const clearAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        selected.forEach((opt) => onChange(opt));
    };

    const filteredOptions =
        options?.filter((option) => {
            if (!searchTerm) return true;
            const labelToSearch = getSearchLabel ? getSearchLabel(option) : option;
            return String(labelToSearch)
                .toLowerCase()
                .includes(searchTerm.toLowerCase());
        }) || [];

    return (
        <div className={cn("space-y-1.5", className)}>
            <label className="ui-label">
                <span className={cn(required && "ui-label-required")}>{label}</span>
            </label>

            <Popover.Root open={isOpen} onOpenChange={setIsOpen} modal={true}>
                <Popover.Trigger asChild>
                    <div
                        ref={triggerRef}
                        data-state={isOpen ? "open" : "closed"}
                        data-invalid={Boolean(error)}
                        className="ui-input ui-select ui-input-multi"
                    >
                        {/* Selected Item Pills */}
                        {selected.length > 0 &&
                            selected.map((item) => (
                                <div
                                    key={item}
                                    className="ui-chip animate-in fade-in zoom-in-95 duration-200"
                                >
                                    <span className="text-sm font-medium text-gray-700">
                                        {renderSelected ? renderSelected(item) : item}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleOption(item);
                                        }}
                                        className="text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}

                        {/* Placeholder when nothing is selected */}
                        {selected.length === 0 && (
                            <span className="ui-placeholder text-sm ml-1">{placeholder}</span>
                        )}

                        {/* Action Icons Right */}
                        <div className="ml-auto flex items-center gap-1 px-1">
                            {selected.length > 0 && (
                                <X
                                    onClick={clearAll}
                                    className="w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                                />
                            )}
                            <ChevronDown
                                className={cn(
                                    "w-4 h-4 text-gray-400 transition-transform duration-200",
                                    isOpen && "rotate-180",
                                )}
                            />
                        </div>
                    </div>
                </Popover.Trigger>
                {error && <p className="ui-error">{error}</p>}

                <Popover.Portal>
                    <Popover.Content
                        align="start"
                        sideOffset={5}
                        style={{ width: triggerWidth || "auto" }}
                        className="z-[9999]"
                    >
                        <AnimatePresence>
                            {isOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="ui-menu flex max-h-72 flex-col"
                                >
                                    {showSearch && (
                                        <div className="shrink-0">
                                            <div className="ui-menu-search">
                                                <Search />
                                                <input
                                                    type="text"
                                                    placeholder="Search..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onKeyDown={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="ui-menu-list">
                                        {filteredOptions.length === 0 ? (
                                            <div className="ui-menu-empty">No results found</div>
                                        ) : (
                                            filteredOptions.map((option, index) => {
                                                const isSelected = selected.some(
                                                    (s) => String(s).toLowerCase() === String(option).toLowerCase()
                                                );

                                                return (
                                                    <div
                                                        key={index}
                                                        onClick={() => toggleOption(option)}
                                                        role="option"
                                                        aria-selected={isSelected}
                                                        className="ui-menu-item"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            {/* Custom Checkbox */}
                                                            <span className="ui-check" data-checked={isSelected}>
                                                                {isSelected && <Check />}
                                                            </span>
                                                            <span>
                                                                {renderOption ? renderOption(option) : option}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </Popover.Content>
                </Popover.Portal>
            </Popover.Root>
        </div>
    );
};

export default MultiSelect;
