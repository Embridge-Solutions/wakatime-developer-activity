'use client';

import { useState } from 'react';
import { CheckCircle2, PlugZap, Send, Server, XCircle } from 'lucide-react';
import PageWrapper from '@/components/layout/pageWrapper';
import { Panel } from '@/components/activity/Panel';
import { showAlert } from '@/components/common/AlertHandler';
import { hasScope } from '@/utils/auth-store';
import { MailKind, useGetSmtpStatusQuery, useSendTestMailMutation, useTestSmtpMutation } from '@/redux/slice/mail';

const Row = ({ label, value, ok }: { label: string; value: React.ReactNode; ok?: boolean }) => (
  <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-2.5 text-[13px] last:border-0">
    <span className="text-slate-500">{label}</span>
    <span className="flex items-center gap-1.5 text-right font-medium text-slate-900">
      {ok === true && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
      {ok === false && <XCircle className="h-4 w-4 text-rose-600" />}
      {value}
    </span>
  </div>
);

/**
 * Mail server (SMTP). Shows only a few non-secret fields, tests the connection
 * and sends test mails. Credentials are kept on the server and never shown.
 */
export default function MailServerPage() {
  const canUpdate = hasScope('settings_update');
  const { data, refetch } = useGetSmtpStatusQuery();
  const [testSmtp, { isLoading: testing }] = useTestSmtpMutation();
  const [sendTest, { isLoading: sending }] = useSendTestMailMutation();
  const [to, setTo] = useState('');
  const [kind, setKind] = useState<MailKind>('welcome');
  const s = data?.data;

  const runTest = async () => {
    try {
      const res = await testSmtp().unwrap();
      showAlert({ status: 'success', message: res.msg });
    } catch (err: any) {
      showAlert({ status: 'error', message: `${err?.data?.msg ?? 'Connection failed'}${err?.data?.detail ? ` — ${err.data.detail}` : ''}` });
    }
  };
  const runSend = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await sendTest({ to, kind }).unwrap();
      showAlert({ status: 'success', message: `${res.msg} to ${res.data.to}` });
    } catch (err: any) {
      showAlert({ status: 'error', message: `${err?.data?.msg ?? 'Sending failed'}${err?.data?.detail ? ` — ${err.data.detail}` : ''}` });
    }
  };

  return (
    <PageWrapper title="Mail Server" subtitle="SMTP connection used for weekly reports and welcome mails" titleIcon={<Server />} showRefreshButton onRefresh={refetch} noCard>
      <div className="grid gap-3 xl:grid-cols-2">
        <Panel
          title="Current configuration"
          right={<span className="ui-pill" data-tone={s?.configured ? 'success' : 'danger'}>{s?.configured ? 'Configured' : 'Not configured'}</span>}
        >
          {s && (
            <>
              <Row label="Status" value={s.configured ? 'Ready' : 'Not set up yet'} ok={s.configured} />
              <Row label="Mail server" value={s.server || '—'} />
              <Row label="Security" value={s.security || '—'} />
              <Row label="Account" value={s.user || '—'} />
              <Row label="Sender" value={s.sender || '—'} />
              {!s.configured && (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800">
                  The mail server is not set up yet — ask your system administrator.
                </p>
              )}
            </>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="ui-btn ui-btn-secondary" onClick={runTest} disabled={!canUpdate || testing || !s?.configured}>
              <PlugZap className="h-4 w-4" /> {testing ? 'Testing…' : 'Test connection'}
            </button>
          </div>
        </Panel>

        <div className="space-y-3">
          <Panel title="Send a test mail" right={<Send className="h-4 w-4 text-slate-400" />}>
            <form onSubmit={runSend} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
                <div className="ui-field">
                  <label htmlFor="testTo" className="ui-label"><span className="ui-label-required">To</span></label>
                  <input id="testTo" type="email" required className="ui-input" value={to} onChange={(e) => setTo(e.target.value)} placeholder="you@company.com" />
                </div>
                <div className="ui-field">
                  <label htmlFor="testKind" className="ui-label">Mail</label>
                  <select id="testKind" className="ui-select" value={kind} onChange={(e) => setKind(e.target.value as MailKind)}>
                    <option value="welcome">Welcome mail</option>
                    <option value="weeklyDeveloper">Weekly — developer</option>
                    <option value="weeklyTeam">Weekly — team</option>
                  </select>
                </div>
              </div>
              <p className="text-[12px] text-slate-500">Sent with real data (last week) and “[Test]” in the subject. It does not count as the weekly mail.</p>
              <button type="submit" className="ui-btn ui-btn-primary" disabled={!canUpdate || sending || !s?.configured}>
                <Send className="h-4 w-4" /> {sending ? 'Sending…' : 'Send test mail'}
              </button>
            </form>
          </Panel>

        </div>
      </div>
    </PageWrapper>
  );
}
