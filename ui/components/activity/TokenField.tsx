'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, Eye, EyeOff, Loader2, XCircle } from 'lucide-react';
import { useVerifyApiKeyMutation, useVerifyMyApiKeyMutation, WakaAccount } from '@/redux/slice/developer';

export const WAKATIME_TOKEN_URL = 'https://wakatime.com/oauth';

/**
 * WakaTime access-token input with show / hide and a "Test" button that checks
 * the token with WakaTime (nothing is saved). The token is sent to the API only;
 * it is stored encrypted and never shown again.
 */
export default function TokenField({
  value,
  onChange,
  required = false,
  label = 'WakaTime access token',
  self = false,
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  label?: string;
  /** My WakaTime: the Test button checks with the user's own endpoint */
  self?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const [verifyAdmin, { isLoading: adminLoading }] = useVerifyApiKeyMutation();
  const [verifyMine, { isLoading: mineLoading }] = useVerifyMyApiKeyMutation();
  const verify = self ? verifyMine : verifyAdmin;
  const isLoading = adminLoading || mineLoading;
  const [result, setResult] = useState<{ ok: boolean; msg: string; account?: WakaAccount } | null>(null);

  const test = async () => {
    setResult(null);
    try {
      const res = await verify(value.trim()).unwrap();
      setResult({ ok: true, msg: res.msg, account: res.data });
    } catch (err: any) {
      setResult({ ok: false, msg: err?.data?.msg ?? 'Could not check the token' });
    }
  };

  const plainKey = value.trim().startsWith('waka_') && !value.trim().startsWith('waka_tok_');

  return (
    <div className="ui-field">
      <label htmlFor="wakaToken" className="ui-label">
        <span className={required ? 'ui-label-required' : undefined}>{label}</span>
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            id="wakaToken"
            name="wakaToken"
            type={visible ? 'text' : 'password'}
            autoComplete="off"
            spellCheck={false}
            required={required}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setResult(null);
            }}
            placeholder="waka_tok_…"
            className="ui-input pr-9 font-mono text-[13px]"
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Hide token' : 'Show token'}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <button type="button" onClick={test} disabled={!value.trim() || isLoading} className="ui-btn ui-btn-secondary">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Test
        </button>
      </div>

      <p className="mt-1.5 text-[12px] leading-relaxed text-slate-500">
        {self ? 'Open' : 'The developer opens'}{' '}
        <a href={WAKATIME_TOKEN_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-semibold underline">
          wakatime.com/oauth <ExternalLink className="h-3 w-3" />
        </a>{' '}
        while signed in {self ? 'and copy' : 'and copies'} the token (starts with <code>waka_tok_</code>). The secret API key from WakaTime settings
        is write-only and cannot read data.
      </p>

      {plainKey && !result && (
        <p className="mt-2 flex items-start gap-1.5 text-[12.5px] text-amber-700">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          This looks like the secret API key, not the access token — WakaTime will most likely reject it.
        </p>
      )}

      {result && (
        <div
          className={`mt-2 rounded-lg border px-3 py-2 text-[12.5px] ${
            result.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
          role="status"
        >
          <p className="flex items-center gap-1.5 font-semibold">
            {result.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {result.msg}
          </p>
          {result.account && (
            <p className="mt-1 text-emerald-900/80">
              WakaTime user <strong>{result.account.wakaUsername ?? result.account.displayName ?? '—'}</strong>
              {result.account.email ? ` · ${result.account.email}` : ''} · timezone {result.account.timezone ?? '—'}
            </p>
          )}
          {result.account?.timezoneWarning && (
            <p className="mt-1 flex items-start gap-1.5 text-amber-800">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {result.account.timezoneWarning}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
