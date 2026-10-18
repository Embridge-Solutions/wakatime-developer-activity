'use client';

import { Dialog as DialogPrimitive } from 'radix-ui';
import { AlertTriangle, CheckCircle2, Info, Loader2 } from 'lucide-react';
import { Dialog, DialogOverlay, DialogPortal } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export type ConfirmVariant = 'danger' | 'warning' | 'info' | 'success';

const VARIANT_ICON: Record<ConfirmVariant, React.ReactNode> = {
  danger: <AlertTriangle className='h-[22px] w-[22px]' />,
  warning: <AlertTriangle className='h-[22px] w-[22px]' />,
  info: <Info className='h-[22px] w-[22px]' />,
  success: <CheckCircle2 className='h-[22px] w-[22px]' />,
};

/**
 * Standard "Are you sure?" alert. Same look on every page — styles live in
 * app/globals.css (".ui-confirm*").
 */
export const ConfirmActionDialog = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  variant,
  icon,
  loading = false,
  confirmColor,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** Accent + confirm button style. Defaults to 'danger' for red confirm colors, else 'warning'. */
  variant?: ConfirmVariant;
  icon?: React.ReactNode;
  /** Keeps the dialog open with a spinner (call onClose yourself when done). */
  loading?: boolean;
  /** @deprecated use `variant`. Kept so older screens keep working. */
  confirmColor?: string;
}) => {
  const resolvedVariant: ConfirmVariant =
    variant ?? (confirmColor && /red|rose|destructive/.test(confirmColor) ? 'danger' : 'warning');

  const handleConfirm = () => {
    onConfirm();
    if (!loading) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !loading && onClose()}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          role='alertdialog'
          data-tone={resolvedVariant}
          style={{ maxWidth: '400px' }}
          className='ui-modal ui-modal--center'>
          <div className='ui-confirm'>
            <span className='ui-confirm-icon'>{icon ?? VARIANT_ICON[resolvedVariant]}</span>
            <DialogPrimitive.Title className='ui-modal-title'>{title}</DialogPrimitive.Title>
            <DialogPrimitive.Description className='ui-modal-desc'>
              {message}
            </DialogPrimitive.Description>
          </div>
          <div className='ui-confirm-actions'>
            <button
              type='button'
              disabled={loading}
              onClick={onClose}
              className='ui-btn ui-btn-secondary'>
              {cancelLabel}
            </button>
            <button
              type='button'
              disabled={loading}
              onClick={handleConfirm}
              autoFocus
              className={cn(
                'ui-btn',
                resolvedVariant === 'danger' ? 'ui-btn-danger' : 'ui-btn-primary',
              )}>
              {loading && <Loader2 className='animate-spin' />}
              {confirmLabel}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};
