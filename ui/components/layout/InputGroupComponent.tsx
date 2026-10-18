'use client';

import { InputGroupComponentInterface } from '@/utils/types';
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
} from '../ui/input-group';
import { cn } from '@/lib/utils';

const InputGroupComponent = ({
  label,
  type = 'text',
  readOnly,
  required,
  name,
  value,
  className,
  handleChange,
  onChange,
  icon,
  placeholder,
  handleIconClick,
  iconView,
}: InputGroupComponentInterface) => {
  return (
    <>
      <div className='space-y-2'>
        {label && (
          <label className='text-sm font-semibold text-gray-800 block'>
            {label}
          </label>
        )}
        <InputGroup
          className={cn(
            'w-full bg-gray-100 border-0 border-none text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent',
            className
          )}>
          {icon && (
            <InputGroupAddon
              align='inline-end' //@ts-ignore
              onClick={handleIconClick || undefined}
              className={handleIconClick ? 'cursor-pointer' : ''}>
              {icon}
            </InputGroupAddon>
          )}
          <InputGroupInput
            type={iconView ? 'text' : type}
            readOnly={readOnly || false}
            required={required}
            name={name}
            value={value}
            onChange={onChange || handleChange}
            placeholder={placeholder}
            className={cn(
              'text-gray-800 bg-transparent border-0 border-none font-medium placeholder:text-gray-500 placeholder:text-sm',
              className
            )}
          />
        </InputGroup>
      </div>
    </>
  );
};

export default InputGroupComponent;
