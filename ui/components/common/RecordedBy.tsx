'use client';

import { useSyncExternalStore } from 'react';
import { format } from 'date-fns';
import { UserRound } from 'lucide-react';
import { getUserData } from '@/utils/auth-store';

const noSubscribe = () => () => {};
const readLoginName = () => {
  const u = getUserData();
  if (!u) return '';
  return `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || '';
};

/** Logged-in user's display name ('' while server-rendering or signed out). */
export function useLoginUserName() {
  return useSyncExternalStore(noSubscribe, readLoginName, () => '');
}

const readLoginUsername = () => getUserData()?.username ?? '';

/** Logged-in user: display name + username (both '' while server-rendering). */
export function useLoginUser() {
  const name = useLoginUserName();
  const username = useSyncExternalStore(noSubscribe, readLoginUsername, () => '');
  return { name: name || username, username };
}

/** Footer wording per form mode — change it here for every modal. */
export const RECORDED_BY_LABEL = {
  create: 'Created by',
  update: 'Updated by',
  default: 'Recorded as',
} as const;

export type RecordMode = 'create' | 'update';

/** Guess the mode from a dialog title: "Create…/New…/Add…" → create, "Update…/Edit…" → update. */
export function modeFromTitle(title?: string): RecordMode | undefined {
  const t = (title || '').trim().toLowerCase();
  if (/^(update|edit|modify|change)\b/.test(t)) return 'update';
  if (/^(create|new|add|register)\b/.test(t)) return 'create';
  return undefined;
}

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

/**
 * Footer stamp: profile initials + "Created by / Updated by / Closed by…",
 * then "<name> · 10 Oct 2026". When the form has its own "by" input, pass it as
 * `name` (updates live as the user types); otherwise the logged-in user is shown.
 */
export default function RecordedBy({
  name,
  label,
  mode,
  date,
}: {
  /** Name entered in the form's "Created by / Closed by…" field. Omit to use the logged-in user. */
  name?: string;
  /** Custom wording; wins over `mode`. */
  label?: string;
  /** 'create' → "Created by", 'update' → "Updated by", none → "Recorded as". */
  mode?: RecordMode;
  date?: Date;
}) {
  const loginName = useLoginUserName();
  const text = label ?? RECORDED_BY_LABEL[mode ?? 'default'];
  const person = (name === undefined ? loginName : name).trim();
  return (
    <>
      <span className='ui-avatar h-8 w-8' aria-hidden data-empty={!person}>
        {person ? initialsOf(person) : <UserRound className='h-3.5 w-3.5' />}
      </span>
      <span className='flex min-w-0 flex-col leading-tight' aria-live='polite'>
        <span className='text-[11px] text-slate-500'>{text}</span>
        <span className='truncate text-[12.5px]'>
          {person ? (
            <b className='font-semibold text-slate-800'>{person}</b>
          ) : (
            <span className='italic text-slate-400'>Not entered yet</span>
          )}
          <span className='text-slate-500'> · {format(date ?? new Date(), 'd MMM yyyy')}</span>
        </span>
      </span>
    </>
  );
}
