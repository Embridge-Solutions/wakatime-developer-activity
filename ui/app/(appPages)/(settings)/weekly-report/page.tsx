'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, Eye, Save, Send } from 'lucide-react';
import PageWrapper from '@/components/layout/pageWrapper';
import { Panel } from '@/components/activity/Panel';
import MailPreviewDialog from '@/components/activity/MailPreviewDialog';
import { ConfirmActionDialog } from '@/components/common/confirmationDialog';
import { showAlert } from '@/components/common/AlertHandler';
import { fmtDay } from '@/components/activity/format';
import { hasScope } from '@/utils/auth-store';
import {
  MailKind,
  WeeklyReportSettings,
  useGetMailSettingsQuery,
  usePreviewMailMutation,
  useSendWeeklyNowMutation,
  useUpdateMailSettingMutation,
} from '@/redux/slice/mail';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const Check = ({ checked, onChange, disabled, title, text }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; title: string; text: string }) => (
  <label className="flex cursor-pointer gap-3 rounded-lg border border-slate-200 p-3 has-[:checked]:border-[var(--action)] has-[:checked]:bg-[var(--action-soft)]">
    <input type="checkbox" className="mt-0.5 h-4 w-4" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
    <span>
      <span className="block text-[13.5px] font-semibold text-slate-900">{title}</span>
      <span className="block text-[12.5px] leading-relaxed text-slate-500">{text}</span>
    </span>
  </label>
);

/**
 * Weekly report mails: every developer gets their own week; users who may see every
 * developer (scope "See every developer's data" / Super Admin) get the whole team.
 */
export default function WeeklyReportPage() {
  const canUpdate = hasScope('settings_update');
  const { data, refetch } = useGetMailSettingsQuery();
  const [update, { isLoading: saving }] = useUpdateMailSettingMutation();
  const [previewMail, { isLoading: previewing }] = usePreviewMailMutation();
  const [sendNow, { isLoading: sendingNow }] = useSendWeeklyNowMutation();

  const [enabled, setEnabled] = useState(true);
  const [form, setForm] = useState<WeeklyReportSettings | null>(null);
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [confirm, setConfirm] = useState<null | { force: boolean }>(null);

  useEffect(() => {
    if (data?.data) {
      setEnabled(data.data.weeklyReport.isEnabled);
      setForm(data.data.weeklyReport.settings);
    }
  }, [data]);

  const set = (patch: Partial<WeeklyReportSettings>) => setForm((f) => (f ? { ...f, ...patch } : f));
  const lastWeek = data?.schedule?.lastWeek;

  const save = async () => {
    if (!form) return;
    try {
      const res = await update({ mailType: 'weeklyReport', isEnabled: enabled, settings: form }).unwrap();
      showAlert({ status: 'success', message: res.msg });
    } catch (err: any) {
      showAlert({ status: 'error', message: `${err?.data?.msg ?? 'Could not save'}${err?.data?.detail ? `: ${err.data.detail}` : ''}` });
    }
  };
  const openPreview = async (kind: MailKind) => {
    try {
      const res = await previewMail({ kind }).unwrap();
      setPreview(res.data);
    } catch (err: any) {
      showAlert({ status: 'error', message: err?.data?.msg ?? 'Preview failed' });
    }
  };
  const runNow = async () => {
    const force = Boolean(confirm?.force);
    setConfirm(null);
    try {
      const res = await sendNow({ force }).unwrap();
      const r = res.data;
      showAlert({
        status: r.failed ? 'warning' : 'success',
        message: `${r.sent} sent · ${r.alreadySent} already had it · ${r.skippedIdle} skipped (no activity) · ${r.failed} failed`,
      });
    } catch (err: any) {
      showAlert({ status: 'error', message: err?.data?.msg ?? 'Sending failed' });
    }
  };

  return (
    <PageWrapper title="Weekly Reports" subtitle="Monday-morning summary mails — own week for developers, whole team for admins" titleIcon={<CalendarClock />} showRefreshButton onRefresh={refetch} noCard>
      {form && (
        <div className="grid gap-3 xl:grid-cols-[1fr_380px]">
          <Panel
            title="Schedule & recipients"
            right={
              <label className="flex items-center gap-2 text-[13px] font-semibold text-slate-700">
                <input type="checkbox" className="h-4 w-4" checked={enabled} disabled={!canUpdate} onChange={(e) => setEnabled(e.target.checked)} />
                {enabled ? 'On' : 'Off'}
              </label>
            }
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="ui-field">
                <label htmlFor="day" className="ui-label">Day</label>
                <select id="day" className="ui-select" value={form.dayOfWeek} disabled={!canUpdate} onChange={(e) => set({ dayOfWeek: Number(e.target.value) })}>
                  {DAYS.map((d, i) => (
                    <option key={d} value={i + 1}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="ui-field">
                <label htmlFor="time" className="ui-label">Time (IST)</label>
                <input id="time" type="time" className="ui-input" value={form.time} disabled={!canUpdate} onChange={(e) => set({ time: e.target.value })} />
              </div>
            </div>
            <p className="mt-2 text-[12.5px] text-slate-500">
              Each mail covers the previous Monday – Sunday
              {lastWeek ? ` (now: ${fmtDay(lastWeek.fromDate, true)} – ${fmtDay(lastWeek.toDate, true)})` : ''}.
            </p>

            <div className="mt-4 space-y-2">
              <Check
                checked={form.sendToDevelopers}
                disabled={!canUpdate}
                onChange={(v) => set({ sendToDevelopers: v })}
                title="Each developer — their own week"
                text="Every tracked, active developer gets a mail with only their own coding time, days, projects, branches, languages and AI use."
              />
              <Check
                checked={form.sendToTeamViewers}
                disabled={!canUpdate}
                onChange={(v) => set({ sendToTeamViewers: v })}
                title="Admins — the whole team"
                text="Users whose role can see every developer (Super Admin, Admin) get the team report: every developer, projects, AI models and who needs attention."
              />
              <Check
                checked={form.includeIdleDevelopers}
                disabled={!canUpdate}
                onChange={(v) => set({ includeIdleDevelopers: v })}
                title="Also mail developers with no activity"
                text="Off: a developer with no coding that week gets no mail (they are listed under “Needs attention” in the team report)."
              />
            </div>

            <div className="ui-field mt-4">
              <label htmlFor="extra" className="ui-label">Also send the team report to</label>
              <textarea
                id="extra"
                className="ui-textarea"
                rows={2}
                value={form.extraTeamRecipients}
                disabled={!canUpdate}
                onChange={(e) => set({ extraTeamRecipients: e.target.value })}
                placeholder="manager@company.com, cto@company.com"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="ui-btn ui-btn-primary" onClick={save} disabled={!canUpdate || saving}>
                <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save'}
              </button>
              <span className="self-center text-[12px] text-slate-500">
                {data?.data.weeklyReport.updatedBy ? `Saved by ${data.data.weeklyReport.updatedBy}` : 'Default settings'} · {data?.schedule.text}
              </span>
            </div>
          </Panel>

          <div className="space-y-3">
            <Panel title="Preview" right={<Eye className="h-4 w-4 text-slate-400" />}>
              <p className="mb-3 text-[12.5px] text-slate-500">See the mail with last week&apos;s real data.</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="ui-btn ui-btn-secondary" disabled={previewing} onClick={() => openPreview('weeklyDeveloper')}>Developer mail</button>
                <button type="button" className="ui-btn ui-btn-secondary" disabled={previewing} onClick={() => openPreview('weeklyTeam')}>Team mail</button>
              </div>
            </Panel>
            <Panel title="Send last week's reports now" right={<Send className="h-4 w-4 text-slate-400" />}>
              <p className="mb-3 text-[12.5px] leading-relaxed text-slate-500">
                Each person gets each week&apos;s mail only once — running it again only sends to people who did not get it yet.
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="ui-btn ui-btn-primary" disabled={!canUpdate || sendingNow} onClick={() => setConfirm({ force: false })}>
                  {sendingNow ? 'Sending…' : 'Send now'}
                </button>
                <button type="button" className="ui-btn ui-btn-secondary" disabled={!canUpdate || sendingNow} onClick={() => setConfirm({ force: true })}>
                  Send again to everyone
                </button>
              </div>
            </Panel>
          </div>
        </div>
      )}

      <MailPreviewDialog mail={preview} onClose={() => setPreview(null)} />
      <ConfirmActionDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={runNow}
        loading={sendingNow}
        title={confirm?.force ? 'Send again to everyone' : 'Send weekly reports now'}
        message={
          confirm?.force
            ? "Send last week's reports to every recipient again, even those who already got them?"
            : "Send last week's reports now to everyone who has not received them yet?"
        }
        confirmLabel="Yes, Send"
      />
    </PageWrapper>
  );
}
