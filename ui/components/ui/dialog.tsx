'use client';

import * as React from 'react';
import { XIcon } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot='dialog' {...props} />;
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot='dialog-trigger' {...props} />;
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot='dialog-portal' {...props} />;
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot='dialog-close' {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot='dialog-overlay'
      className={cn('ui-modal-overlay', className)}
      {...props}
    />
  );
}

/**
 * placement="center" (default) → classic dialog in the middle of the screen.
 * placement="side"             → panel that slides in from the right edge.
 * Look & feel lives in app/globals.css (".ui-modal*").
 */
function DialogContent({
  className,
  children,
  showCloseButton = true,
  placement = 'center',
  onPointerDownOutside,
  onInteractOutside,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
  placement?: 'center' | 'side';
}) {
  return (
    <DialogPortal data-slot='dialog-portal'>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot='dialog-content'
        data-placement={placement}
        onPointerDownOutside={onPointerDownOutside}
        onInteractOutside={onInteractOutside}
        className={cn(
          placement === 'side'
            ? 'ui-modal ui-modal--side'
            : 'bg-background text-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid translate-x-[-50%] translate-y-[-50%] gap-4 rounded-[var(--modal-radius)] p-6 shadow-[var(--modal-shadow)] duration-200 outline-none',
          className,
        )}
        {...props}>
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot='dialog-close'
            className='ui-modal-close absolute top-3 right-3'>
            <XIcon className='w-4 h-4' />
            <span className='sr-only'>Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='dialog-header'
      className={cn('flex flex-col gap-2 text-center sm:text-left', className)}
      {...props}
    />
  );
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  showCloseButton?: boolean;
}) {
  return (
    <div
      data-slot='dialog-footer'
      className={cn(
        'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
        className,
      )}
      {...props}>
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant='outline'>Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot='dialog-title'
      className={cn('ui-modal-title', className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot='dialog-description'
      className={cn('ui-modal-desc', className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
