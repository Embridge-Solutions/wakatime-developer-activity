'use client';

import { useEffect, useState } from 'react';
import { Eye, MailPlus, Save } from 'lucide-react';
import PageWrapper from '@/components/layout/pageWrapper';
import { Panel } from '@/components/activity/Panel';
import MailPreviewDialog from '@/components/activity/MailPreviewDialog';
import { showAlert } from '@/components/common/AlertHandler';
import { hasScope } from '@/utils/auth-store';
import { useGetMailSettingsQuery, usePreviewMailMutation, useUpdateMailSettingMutation } from '@/redux/slice/mail';

const STEPS_TRACKED = [
  'Sign in with the username (link in the mail)',
  'Change the password — Profile › Login & Password',
  'Install the WakaTime plugin in every editor (secret API key)',
  'Set the WakaTime timezone to Asia/Kolkata',
  'Copy the access token from wakatime.com/oauth → Profile › My WakaTime → Test → Save (skipped when the admin already set it)',
  'Open My Dashboard the next day; weekly mail every Monday',
];

/** Welcome mail with the next steps — sent when a user is created (and again from the Users list). */
export default function WelcomeMailPage() {
  const canUpdate = hasScope('settings_update');
  const { data, refetch } = useGetMailSettingsQuery();
  const [update, { isLoading: saving }] = useUpdateMailSettingMutation();
  const [previewMail, { isLoading: previewing }] = usePreviewMailMutation();
  const [enabled, setEnabled] = useState(true);
  const [note, setNote] = useState('');
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);

  useEffect(() => {
    if (data?.data) {
      setEnabled(data.data.welcome.isEnabled);
      setNote(data.data.welcome.settings.extraNote);
    }
  }, [data]);

  const save = async () => {
    try {
      const res = await update({ mailType: 'welcome', isEnabled: enabled, settings: { extraNote: note } }).unwrap();
      showAlert({ status: 'success', message: res.msg });
    } catch (err: any) {
      showAlert({ status: 'error', message: err?.data?.msg ?? 'Could not save' });
    }
  };
  const openPreview = async () => {
    try {
      setPreview((await previewMail({ kind: 'welcome' }).unwrap()).data);
    } catch (err: any) {
      showAlert({ status: 'error', message: err?.data?.msg ?? 'Preview failed' });
    }
  };

  return (
    <PageWrapper title="Welcome Mail" subtitle="Sent to every new user with what to do next" titleIcon={<MailPlus />} showRefreshButton onRefresh={refetch} noCard>
      <div className="grid gap-3 xl:grid-cols-[1fr_420px]">
        <Panel
          title="Welcome mail"
          right={
            <label className="flex items-center gap-2 text-[13px] font-semibold text-slate-700">
              <input type="checkbox" className="h-4 w-4" checked={enabled} disabled={!canUpdate} onChange={(e) => setEnabled(e.target.checked)} />
              {enabled ? 'On' : 'Off'}
            </label>
          }
        >
          <p className="text-[13px] leading-relaxed text-slate-600">
            Sent automatically when a user is created (Users › Add User). It never contains a password. To send it again, use the
            mail button in the Users list.
          </p>
          <div className="ui-field mt-4">
            <label htmlFor="note" className="ui-label">Note from the administrator (optional)</label>
            <textarea
              id="note"
              rows={5}
              className="ui-textarea"
              value={note}
              disabled={!canUpdate}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. For help, contact the DevOps team on #dev-support."
            />
            <p className="mt-1 text-[12px] text-slate-500">Added at the end of every welcome mail.</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="ui-btn ui-btn-primary" onClick={save} disabled={!canUpdate || saving}>
              <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="ui-btn ui-btn-secondary" onClick={openPreview} disabled={previewing}>
              <Eye className="h-4 w-4" /> Preview
            </button>
          </div>
        </Panel>

        <Panel title="Steps in the mail">
          <p className="mb-2 text-[12.5px] text-slate-500">For a user whose coding activity is tracked:</p>
          <ol className="list-decimal space-y-1.5 pl-5 text-[13px] leading-relaxed text-slate-700">
            {STEPS_TRACKED.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <p className="mt-3 text-[12.5px] text-slate-500">Users who are not tracked (e.g. managers) get steps 1–2 and “open the dashboards”.</p>
        </Panel>
      </div>
      <MailPreviewDialog mail={preview} onClose={() => setPreview(null)} />
    </PageWrapper>
  );
}
