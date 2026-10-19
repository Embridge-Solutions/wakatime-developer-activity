'use client';

import { useState } from 'react';
import { KeyRound, ShieldCheck, UserCog } from 'lucide-react';
import PageWrapper from '@/components/layout/pageWrapper';
import { Panel } from '@/components/activity/Panel';
import PasswordInput from '@/components/activity/PasswordInput';
import { showAlert } from '@/components/common/AlertHandler';
import { hasScope, isSuperAdmin } from '@/utils/auth-store';
import { useGetSecurityQuery, useSetDeveloperSelfTokenMutation, useSetTokenPasswordMutation } from '@/redux/slice/security';

const EMPTY = { currentPassword: '', loginPassword: '', newPassword: '', confirmPassword: '' };

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '');

/**
 * Settings › Security
 *  - Token protection password: needed to set, replace or remove any WakaTime token.
 *    Changing it needs the current one (a Super Admin may use their own login password instead).
 *  - Whether developers may update their own token on My WakaTime.
 */
export default function SecuritySettingsPage() {
  const canUpdate = hasScope('settings_update');
  const superAdmin = isSuperAdmin();
  const { data, refetch } = useGetSecurityQuery();
  const [setTokenPassword, { isLoading: saving }] = useSetTokenPasswordMutation();
  const [setSelfToken, { isLoading: toggling }] = useSetDeveloperSelfTokenMutation();
  const [form, setForm] = useState(EMPTY);
  const [useLogin, setUseLogin] = useState(false);
  const s = data?.data;
  const isSet = Boolean(s?.tokenPassword.isSet);

  const field = (name: keyof typeof EMPTY) => (value: string) => setForm((f) => ({ ...f, [name]: value }));

  const mismatch = form.confirmPassword !== '' && form.newPassword !== form.confirmPassword;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mismatch) return showAlert({ status: 'error', message: 'New password and confirmation do not match' });
    try {
      const res = await setTokenPassword({
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
        ...(isSet && !useLogin ? { currentPassword: form.currentPassword } : {}),
        ...(isSet && useLogin ? { loginPassword: form.loginPassword } : {}),
      }).unwrap();
      showAlert({ status: 'success', message: res.msg });
      setForm(EMPTY);
      setUseLogin(false);
    } catch (err: any) {
      showAlert({ status: 'error', message: err?.data?.msg ?? 'Could not save the password' });
    }
  };

  const toggleSelf = async (enabled: boolean) => {
    try {
      const res = await setSelfToken(enabled).unwrap();
      showAlert({ status: 'success', message: res.msg });
    } catch (err: any) {
      showAlert({ status: 'error', message: err?.data?.msg ?? 'Could not save' });
    }
  };

  return (
    <PageWrapper title="Security" subtitle="Who may change WakaTime tokens" titleIcon={<ShieldCheck />} showRefreshButton onRefresh={refetch} noCard>
      <div className="grid gap-3 xl:grid-cols-2">
        <Panel
          title="Token protection password"
          right={<span className="ui-pill" data-tone={isSet ? 'success' : 'warning'}>{isSet ? 'Set' : 'Not set'}</span>}
        >
          <p className="text-[13px] leading-relaxed text-slate-600">
            Anyone who sets, replaces or removes a developer&apos;s WakaTime token must enter this password.
            When it is changed, only people who know the new password can edit tokens.
            Every token change is mailed to the Super Admins and to the developer.
          </p>
          {isSet ? (
            <p className="mt-2 text-[12.5px] text-slate-500">
              Last changed{s?.tokenPassword.updatedBy ? <> by <b>{s.tokenPassword.updatedBy}</b></> : null}
              {s?.tokenPassword.updatedDate ? <> on {when(s.tokenPassword.updatedDate)}</> : null}
            </p>
          ) : (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800">
              Set the password first — until then nobody can add or change a token.
            </p>
          )}

          {canUpdate ? (
            <form onSubmit={submit} className="mt-4 space-y-3">
              {isSet && !useLogin && (
                <PasswordInput id="currentPassword" label="Current token password" required value={form.currentPassword} onChange={field('currentPassword')} />
              )}
              {isSet && useLogin && (
                <PasswordInput
                  id="loginPassword"
                  label="Your login password"
                  required
                  value={form.loginPassword}
                  onChange={field('loginPassword')}
                  help="Super Admin only — use this when nobody knows the current token password."
                />
              )}
              {isSet && superAdmin && (
                <button type="button" className="text-[12.5px] font-semibold underline" onClick={() => setUseLogin((v) => !v)}>
                  {useLogin ? 'I know the current token password' : 'Forgot the current token password?'}
                </button>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <PasswordInput
                  id="newPassword"
                  label="New password"
                  required
                  value={form.newPassword}
                  onChange={field('newPassword')}
                  autoComplete="new-password"
                  help="At least 8 characters, with a letter and a number."
                />
                <PasswordInput
                  id="confirmPassword"
                  label="Confirm new password"
                  required
                  value={form.confirmPassword}
                  onChange={field('confirmPassword')}
                  autoComplete="new-password"
                  help={mismatch ? <span className="text-rose-600">Does not match</span> : undefined}
                />
              </div>
              <button type="submit" className="ui-btn ui-btn-primary" disabled={saving || mismatch}>
                <KeyRound className="h-4 w-4" /> {saving ? 'Saving…' : isSet ? 'Change password' : 'Set password'}
              </button>
            </form>
          ) : (
            <p className="mt-3 text-[12.5px] text-slate-500">You can view this setting but not change it.</p>
          )}
        </Panel>

        <Panel title="Developers' own tokens" right={<UserCog className="h-4 w-4 text-slate-400" />}>
          <label className="flex items-start gap-2.5 text-[13px] text-slate-700">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4"
              checked={Boolean(s?.developerSelfToken)}
              disabled={!canUpdate || toggling || !s}
              onChange={(e) => toggleSelf(e.target.checked)}
            />
            <span>
              <b>Developers may update their own token</b> on Profile › My WakaTime.
              They confirm with their own login password, and the change is mailed to the Super Admins.
              Turn it off to let only admins (with the token protection password) change tokens.
            </span>
          </label>
        </Panel>
      </div>
    </PageWrapper>
  );
}
