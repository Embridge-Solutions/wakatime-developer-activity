'use client';

import { useState } from 'react';
import { ExternalLink, KeyRound, Save } from 'lucide-react';
import TokenField from '@/components/activity/TokenField';
import PasswordInput from '@/components/activity/PasswordInput';
import { fmtDateTime } from '@/components/activity/format';
import { showAlert } from '@/components/common/AlertHandler';
import { useGetMyDeveloperQuery, useUpdateMyApiKeyMutation } from '@/redux/slice/developer';
import { useGetSecurityQuery } from '@/redux/slice/security';

const STATUS: Record<string, { text: string; tone: string }> = {
  VALID: { text: 'Connected', tone: 'success' },
  INVALID: { text: 'Rejected by WakaTime — paste a new token', tone: 'danger' },
  NOT_SET: { text: 'Not connected yet', tone: 'warning' },
};

/**
 * Profile › My WakaTime — a developer connects their own WakaTime account (access token),
 * confirmed with their login password. Admins can switch this off in Settings › Security.
 */
export default function MyWakaTimePage() {
  const { data, isLoading } = useGetMyDeveloperQuery();
  const [save, { isLoading: saving }] = useUpdateMyApiKeyMutation();
  const { data: security } = useGetSecurityQuery();
  const [token, setToken] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const me = data?.data;
  const selfAllowed = security?.data?.developerSelfToken ?? true;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await save({ apiKey: token.trim(), loginPassword }).unwrap();
      showAlert({ status: 'success', message: res.msg });
      if (res.warning) showAlert({ status: 'warning', message: res.warning });
      setToken('');
      setLoginPassword('');
    } catch (err: any) {
      showAlert({ status: 'error', message: err?.data?.msg ?? 'Could not save the token' });
    }
  };

  if (isLoading) return <p className="text-sm text-slate-400">Loading…</p>;

  if (!me) {
    return (
      <div className="ui-status-card" data-tone="info">
        <p className="text-sm font-semibold text-slate-800">Your coding activity is not tracked</p>
        <p className="mt-1 text-[13px] text-slate-600">Ask an administrator to turn on WakaTime tracking for your user, then come back here.</p>
      </div>
    );
  }

  const status = STATUS[me.keyStatus] ?? STATUS.NOT_SET;
  return (
    <div className="space-y-4">
      <section className="ui-card">
        <header className="ui-card-head">
          <p className="ui-card-title flex items-center gap-2"><KeyRound className="h-4 w-4 text-slate-400" /> My WakaTime</p>
          <span className="ui-pill" data-tone={status.tone}>{status.text}</span>
        </header>
        <dl className="ui-kv ui-card-body">
          <div><dt>Token</dt><dd>{me.hasApiKey ? `••••${me.apiKeyHint}` : '—'}</dd></div>
          <div><dt>WakaTime user</dt><dd>{me.wakaUsername ? `@${me.wakaUsername}` : '—'}</dd></div>
          <div><dt>WakaTime timezone</dt><dd className={me.wakaTimezone && me.wakaTimezone !== 'Asia/Kolkata' ? 'text-amber-700' : ''}>{me.wakaTimezone || '—'}</dd></div>
          <div><dt>Last collected</dt><dd>{me.lastSyncDate ? `${fmtDateTime(me.lastSyncDate)} · ${me.lastSyncStatus}` : 'not yet'}</dd></div>
        </dl>
      </section>

      {selfAllowed ? (
      <section className="ui-card">
        <header className="ui-card-head"><p className="ui-card-title">{me.hasApiKey ? 'Replace your token' : 'Connect your WakaTime account'}</p></header>
        <form onSubmit={submit} className="ui-card-body space-y-3">
          <ol className="list-decimal space-y-1 pl-5 text-[13px] leading-relaxed text-slate-700">
            <li>Install the WakaTime plugin in your editors (VS Code: Extensions → “WakaTime”).</li>
            <li>
              In WakaTime set <b>Timezone = Asia/Kolkata</b> (
              <a href="https://wakatime.com/settings/preferences" target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-semibold underline">
                preferences <ExternalLink className="h-3 w-3" />
              </a>
              ).
            </li>
            <li>Open wakatime.com/oauth, copy the access token, paste it below → <b>Test</b> → <b>Save</b>.</li>
          </ol>
          <TokenField value={token} onChange={setToken} required self label="Access token" />
          <PasswordInput
            id="myLoginPassword"
            label="Your login password"
            required
            value={loginPassword}
            onChange={setLoginPassword}
            autoComplete="current-password"
            help="To confirm it is you. The change is mailed to you and the Super Admins."
          />
          <button type="submit" className="ui-btn ui-btn-primary" disabled={saving || !token.trim() || !loginPassword}>
            <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save token'}
          </button>
          <p className="text-[12px] text-slate-500">The token is checked with WakaTime, stored encrypted and never shown again — only its last 4 characters.</p>
        </form>
      </section>
      ) : (
        <div className="ui-status-card" data-tone="info">
          <p className="text-sm font-semibold text-slate-800">Token changes are handled by your administrator</p>
          <p className="mt-1 text-[13px] text-slate-600">
            Open wakatime.com/oauth, copy your access token and send it privately to your administrator.
            You will get a mail when it is saved.
          </p>
        </div>
      )}
    </div>
  );
}
