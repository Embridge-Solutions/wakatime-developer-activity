'use client';

import toast from 'react-hot-toast';
import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from 'lucide-react';

type AlertStatus = 'success' | 'error' | 'loading' | 'info' | 'warning';

interface AlertHandlerProps {
  status: AlertStatus;
  message: string;
}

// Colors come from the status tokens in theme/tokens.css
const STATUS_COLORS: Record<AlertStatus, string> = {
  success: 'var(--color-status-running)',
  error: 'var(--color-status-down)',
  loading: 'var(--color-graphite-500)',
  info: 'var(--color-graphite-700)',
  warning: 'var(--color-status-idle)',
};

const STATUS_ICONS: Record<AlertStatus, React.ReactNode> = {
  success: <CheckCircle2 size={16} strokeWidth={2.4} />,
  error: <XCircle size={16} strokeWidth={2.4} />,
  loading: <Loader2 size={16} strokeWidth={2.4} className='animate-spin' />,
  info: <Info size={16} strokeWidth={2.4} />,
  warning: <AlertTriangle size={16} strokeWidth={2.4} />,
};

// Tinted round icon in the status color
const ColoredIcon = ({ status }: { status: AlertStatus }) => (
  <div
    style={{
      color: STATUS_COLORS[status],
      background: `color-mix(in oklab, ${STATUS_COLORS[status]} 12%, white)`,
      borderRadius: '50%',
      width: '28px',
      height: '28px',
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
    {STATUS_ICONS[status]}
  </div>
);

/**
 * Common Alert Handler Component
 * Displays toast notifications based on status and message
 *
 * @param status - Type of alert: 'success' | 'error' | 'loading' | 'info' | 'warning'
 * @param message - Message to display in the toast
 */
export const showAlert = ({ status, message }: AlertHandlerProps) => {
  const baseStyle = {
    borderRadius: '12px',
    padding: '8px 14px 8px 10px',
    fontSize: '13.5px',
    fontWeight: '500',
    maxWidth: '420px',
    background: '#fff',
    color: 'var(--color-graphite-900)',
    border: '1px solid var(--color-graphite-200)',
    boxShadow: 'var(--shadow-lg)',
  };

  const toastOptions = {
    duration: status === 'loading' ? Infinity : 4000,
    position: 'top-right' as const,
    icon: <ColoredIcon status={status} />,
    style: baseStyle,
  };

  switch (status) {
    case 'success':
      toast.success(message, toastOptions);
      break;

    case 'error':
      toast.error(message, toastOptions);
      break;

    case 'loading':
      toast.loading(message, toastOptions);
      break;

    case 'info':
    case 'warning':
      toast(message, toastOptions);
      break;

    default:
      toast(message, toastOptions);
  }
};

/**
 * Dismiss all active toasts
 */
export const dismissAllAlerts = () => {
  toast.dismiss();
};

/**
 * Dismiss a specific toast by ID
 */
export const dismissAlert = (toastId: string) => {
  toast.dismiss(toastId);
};
