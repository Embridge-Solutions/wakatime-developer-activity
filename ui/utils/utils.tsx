import { ActivityRow,  } from './types';

import {
  PlayCircle,
  PauseCircle,
  WifiOff,
} from 'lucide-react';
/** Machine states the UI renders (the machine-status page that defined this was removed). */
export type MachineStatusValue = 'running' | 'idle' | 'notConnected';

// Normalizes whatever status string the API returns (case/typo variance)
// into the union the UI knows how to render. Anything unrecognized is
// treated as 'stopped' so a bad/unknown value still renders a clear signal.

export const normalizeMachineStatus = (
  status: string | null | undefined,
): MachineStatusValue => {
  const value = (status || '').trim().toLowerCase();
  if (value === 'running') return 'running';
  if (value === 'idle') return 'idle';
  return 'notConnected';
};

export const getStatusColor = (
  status: MachineStatusValue,
) => {
  switch (status) {
    case 'running':
      return 'border-l-green-500 bg-green-50';
    case 'idle':
      return 'border-l-yellow-500 bg-yellow-50';
    case 'notConnected':
      return 'border-l-gray-400 bg-gray-100';
  }
};

export const getStatusIcon = (status: MachineStatusValue) => {
  switch (status) {
    case 'running':
      return <PlayCircle className='h-4 w-4 text-green-500' />;
    case 'idle':
      return <PauseCircle className='h-4 w-4 text-yellow-500' />;
    case 'notConnected':
      return <WifiOff className='h-4 w-4 text-gray-500' />;
  }
};

export const getOEEColor = ({ value }: { value: number }) => {
  let color = value >= 85 ? '#1c9404' : value >= 50 ? '#f5cd07' : '#ed0707';
  return color;
};

export const getProgressColor = ({ value }: { value: number }) => {
  let color =
    value >= 85
      ? '#1c9404'
      : value >= 75 && value <= 84
        ? '#f5cd07'
        : '#ed0707';
  return color;
};

export const formatTimeAgo = (dateStr: string | Date | undefined) => {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Invalid Date';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  if (diffMs < 0) return 'Just now';

  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 60) return `${diffSecs} secs ago`;
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins} mins ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const getUrgency = (
  daysToExpected: number,
  poStatus: string | null,
): ActivityRow['urgencyLevel'] => {
  if (poStatus === 'Completed') return 'normal';
  if (poStatus === 'Not Initiated') return 'na';
  if (daysToExpected < 0) return 'overdue';
  if (daysToExpected <= 7) return 'critical';
  if (daysToExpected <= 21) return 'warning';
  // @ts-ignore
  if (poStatus === 'Not Ready to PO') return '';
  return 'normal';
};

export const formatDate = (dateStr: string) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const getDayDiff = (dateStr: string): number | null => {
  if (!dateStr) return null;
  const end = new Date(dateStr);
  end.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - today.getTime()) / 86400000);
};

  // Helper function to capitalize first letter
export const capitalizeFirst = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

// Formats a duration given in minutes as "DD HH:MM:SS", dropping the leading
// "DD " segment whenever the duration is under a full day.
export const formatMinutesDuration = (minutes: number | string | null | undefined): string => {
  const totalMinutes = Number(minutes);
  if (minutes === null || minutes === undefined || isNaN(totalMinutes)) return '—';

  const sign = totalMinutes < 0 ? '-' : '';
  const totalSeconds = Math.round(Math.abs(totalMinutes) * 60);

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, '0');
  const time = `${pad(hours)}:${pad(mins)}:${pad(secs)}`;

  return days > 0 ? `${sign}${pad(days)} ${time}` : `${sign}${time}`;
};

export const formatDateTime = (dateString: string | null | undefined) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const pad = (n: number) => n.toString().padStart(2, '0');
  
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};