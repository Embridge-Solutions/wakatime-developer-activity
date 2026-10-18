'use client';

import { cn } from '@/lib/utils';
import { ButtonCompInterface } from '@/utils/types';
import { Button } from '../ui/button';

const ButtonComponent = (props: ButtonCompInterface) => {

  const {
    type,
    variant,
    className,
    handleClick,
    text,
  } = props;
  return (
    <>
      <Button
        type={type}
        onClick={() => handleClick?.()}
        variant={variant}
        className={cn(
          'border-text-light-color text-default-bg hover:bg-black hover:text-white px-6 py-2.5 cursor-pointer',
          className ? className : ''
        )}>
        {text}
      </Button>

      <span
        className={
          "pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 " +
          "whitespace-nowrap rounded bg-gray-900 px-2 py-0.5 text-[10px] text-gray-200 " +
          "opacity-0 group-hover/filter:opacity-100 transition-opacity duration-150 z-50 shadow-lg"
        }
      >
        {text}
      </span>
    </>
  );
};

export default ButtonComponent;
