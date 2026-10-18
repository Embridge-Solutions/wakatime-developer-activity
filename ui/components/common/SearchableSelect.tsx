'use client';

import * as React from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { motion } from 'framer-motion';

export interface SelectOption {
  label: string | number;
  value: string | number;
}

export interface SearchableSelectInterface {
  name?: string;
  label?: string;
  value: string | number | null;
  options: SelectOption[];
  onChange: (value: any) => void;
  placeholder?: string;
  className?: string;
  /** Classes for the trigger button only (className also styles the wrapper). */
  triggerClassName?: string;
  /** Accessible id for the trigger, so a <label htmlFor> can point at it. */
  id?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  multiple?: boolean;
  selectedObject?: boolean;
}

export default function SearchableSelect({
  name,
  options,
  value,
  onChange,
  placeholder,
  className,
  triggerClassName,
  id,
  label,
  required,
  error,
  disabled,
  multiple = false,
  selectedObject = false,
}: SearchableSelectInterface) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const defaultPlaceholder = label
    ? `Select ${label}`
    : multiple
      ? 'Select one or more options'
      : 'Select';
  const finalPlaceholder = placeholder || defaultPlaceholder;

  const filteredOptions =
    options?.length > 0
      ? options?.filter((option) =>
          String(option?.label || '')
            .toLowerCase()
            .includes(search?.toLowerCase() || ''),
        )
      : [];

  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];

  const selectedOptions =
    options?.length > 0
      ? options?.filter((option) =>
          selectedValues.some((v) => String(v) === String(option.value)),
        )
      : [];

  const handleSelect = (optionValue: string | number) => {
    if (multiple) {
      const currentValues = Array.isArray(value) ? value : [];
      const isSelected = currentValues.some(
        (v) => String(v) === String(optionValue),
      );
      if (isSelected) {
        onChange(
          currentValues.filter((v) => String(v) !== String(optionValue)),
        );
      } else {
        onChange([...currentValues, optionValue]);
      }
    } else {
      onChange(
        String(optionValue) === String(value) ? '' : String(optionValue),
      );
      setOpen(false);
    }
    setSearch('');
  };

  return (
    <div className={cn('space-y-1.5 relative', className)}>
      {/* Hidden input for Native HTML Form Validation */}
      {required && (
        <input
          type='text'
          name={name}
          className='absolute opacity-0 w-full h-[1px] left-0 bottom-0 -z-10 focus:outline-none'
          required={required}
          value={selectedOptions.length > 0 ? 'selected' : ''}
          onChange={() => {}}
          tabIndex={-1}
        />
      )}
      {label && (
        <label htmlFor={id} className='ui-label'>
          <span className={cn(required && 'ui-label-required')}>{label}</span>
        </label>
      )}
      <Popover open={open && !disabled} onOpenChange={setOpen} modal={true}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type='button'
            disabled={disabled}
            data-invalid={Boolean(error)}
            className={cn('ui-input ui-select', className, triggerClassName)}>
            <div className='flex flex-wrap gap-1.5 flex-1 min-w-0'>
              {selectedOptions.length > 0 ? (
                selectedOptions.map((opt) => (
                  <span
                    key={opt.value}
                    className={cn(
                      'truncate',
                      multiple ? 'ui-chip !h-6' : 'text-slate-900',
                    )}>
                    {opt.label}
                    {multiple && !disabled && (
                      <X
                        className='w-3 h-3 cursor-pointer hover:text-primary/70'
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(opt.value);
                        }}
                      />
                    )}
                  </span>
                ))
              ) : (
                <span className='ui-placeholder truncate'>
                  {finalPlaceholder}
                </span>
              )}
            </div>
            <ChevronDown
              className={cn(
                'transition-transform',
                open ? 'rotate-180' : 'rotate-0',
              )}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className='ui-menu pointer-events-auto w-[var(--radix-popover-trigger-width)] p-0 animate-in fade-in zoom-in-95 duration-150'
          sideOffset={6}
          align='start'>
          <div className='ui-menu-search'>
            <Search />
            <input
              placeholder='Search…'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type='button'
                onClick={() => setSearch('')}
                aria-label='Clear search'
                className='absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700'>
                <X className='h-3 w-3' />
              </button>
            )}
          </div>
          <div
            role='listbox'
            className='ui-menu-list'
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}>
            {filteredOptions.length === 0 ? (
              <div className='ui-menu-empty'>No results found</div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selectedValues.some(
                  (v) => String(v) === String(option.value),
                );
                return (
                  <button
                    key={option.value}
                    type='button'
                    role='option'
                    aria-selected={isSelected}
                    onClick={() =>
                      handleSelect(
                        //@ts-ignore
                        selectedObject ? option : option.value,
                      )
                    }
                    className='ui-menu-item'>
                    <span className='flex-1 truncate text-left'>
                      {option.label}
                    </span>
                    {isSelected && <Check className='ui-menu-check' />}
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className='ui-error'>
          {error}
        </motion.p>
      )}
    </div>
  );
}
