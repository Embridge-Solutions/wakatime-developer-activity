'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ExternalLink, KeyRound, Trash2 } from 'lucide-react';
import PageWrapper from '@/components/layout/pageWrapper';
import Table, { TableColumn } from '@/components/table';
import DialogComponent from '@/components/layout/dialogComponent';
import { ConfirmActionDialog } from '@/components/common/confirmationDialog';
import { showAlert } from '@/components/common/AlertHandler';
import TokenField, { WAKATIME_TOKEN_URL } from '@/components/activity/TokenField';
import { fmtDateTime } from '@/components/activity/format';
import { Developer, useGetDevelopersQuery, useRemoveApiKeyMutation, useUpdateApiKeyMutation } from '@/redux/slice/developer';
import { hasScope } from '@/utils/auth-store';

const STATUS: Record<Developer['keyStatus'], { text: string; tone: string }> = {
  VALID: { text: 'Valid', tone: 'success' },
  INVALID: { text: 'Rejected by WakaTime', tone: 'danger' },
  NOT_SET: { text: 'Not set', tone: 'neutral' },
};

/**
 * One screen for every developer's WakaTime access token: set or replace
 * (checked with WakaTime first, stored encrypted), test, or remove.
 */
function TokensScreen() {
  const params = useSearchParams();
  const { data, refetch } = useGetDevelopersQuery({ status: 'ALL' });
  const [updateApiKey] = useUpdateApiKeyMutation();
  const [removeApiKey, { isLoading: removing }] = useRemoveApiKeyMutation();

  const developers = useMemo(() => data?.data ?? [], [data]);
  const canEdit = hasScope('token_update');
  const [editing, setEditing] = useState<Developer | null>(null);
  const [token, setToken] = useState('');
  const [removeFor, setRemoveFor] = useState<Developer | null>(null);

  // /wakatime-tokens?developerId=3 (from the Users screen) opens that developer's token dialog
  const preselect = Number(params.get('developerId'));
  useEffect(() => {
    if (canEdit && preselect && developers.length && !editing) {
      const d = developers.find((x) => x.developerId === preselect);
      if (d) {
        setEditing(d);
        setToken('');
      }
    }
    // only when the list first arrives
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselect, developers.length]);

  const counts = {
    valid: developers.filter((d) => d.keyStatus === 'VALID').length,
    invalid: developers.filter((d) => d.keyStatus === 'INVALID').length,
    missing: developers.filter((d) => d.keyStatus === 'NOT_SET').length,
  };

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing) return;
    try {
      const res = await updateApiKey({ id: editing.developerId, apiKey: token.trim() }).unwrap();
      showAlert({ status: 'success', message: res.msg });
      if (res.warning) showAlert({ status: 'warning', message: res.warning });
      setEditing(null);
      setToken('');
    } catch (err: any) {
      showAlert({ status: 'error', message: err?.data?.msg ?? 'Could not save the token' });
    }
  };

  const remove = async () => {
    if (!removeFor) return;
    try {
      const res = await removeApiKey(removeFor.developerId).unwrap();
      showAlert({ status: 'success', message: res.msg });
    } catch (err: any) {
      showAlert({ status: 'error', message: err?.data?.msg ?? 'Could not remove the token' });
    }
    setRemoveFor(null);
  };

  const columns: TableColumn<Developer>[] = [
    { key: 'developerId', label: 'Id', display: 'excluded' },
    {
      key: 'developerName',
      label: 'Developer',
      render: (_v, d) => (
        <div>
          <p className="font-semibold text-slate-900">{d.developerName}</p>
          <p className="text-[11.5px] text-slate-500">{d.isActive ? 'Collecting' : 'Inactive — not collected'}</p>
        </div>
      ),
    },
    {
      key: 'keyStatus',
      label: 'Token',
      render: (_v, d) => (
        <div className="flex items-center gap-2">
          <span className="ui-pill" data-tone={STATUS[d.keyStatus].tone}>{STATUS[d.keyStatus].text}</span>
          {d.hasApiKey && <code className="text-[12px] text-slate-500">••••{d.apiKeyHint}</code>}
        </div>
      ),
    },
    { key: 'wakaUsername', label: 'WakaTime User', render: (v) => (v ? `@${v}` : '—') },
    {
      key: 'wakaTimezone',
      label: 'WakaTime Timezone',
      render: (v) =>
        v ? (
          <span className={v === 'Asia/Kolkata' ? '' : 'font-semibold text-amber-700'} title={v === 'Asia/Kolkata' ? '' : 'Ask the developer to set Asia/Kolkata in WakaTime settings'}>
            {v}
          </span>
        ) : (
          '—'
        ),
    },
    { key: 'keyVerifiedDate', label: 'Verified', render: (v) => fmtDateTime(v) },
    { key: 'lastSyncDate', label: 'Last Sync', render: (v, d) => (v ? `${fmtDateTime(v)} · ${d.lastSyncStatus}` : 'Never') },
  ];

  return (
    <PageWrapper
      title="WakaTime Tokens"
      subtitle="Each developer's personal WakaTime access token — checked with WakaTime and stored encrypted"
      titleIcon={<KeyRound />}
      showRefreshButton
      onRefresh={refetch}
      noCard
    >
      <div className="mb-3 grid gap-3 lg:grid-cols-[1fr_auto]">
        <div className="ui-status-card" data-tone="info">
          <p className="text-sm font-semibold text-slate-800">How a developer gets their token</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-[13px] text-slate-600">
            <li>Sign in at wakatime.com and set <strong>Settings → Preferences → Timezone = Asia/Kolkata</strong>.</li>
            <li>
              Open{' '}
              <a href={WAKATIME_TOKEN_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-semibold underline">
                wakatime.com/oauth <ExternalLink className="h-3 w-3" />
              </a>{' '}
              and copy the token (starts with <code>waka_tok_</code>).
            </li>
            <li>Send it privately to the admin, who pastes it here. It is never shown again — only its last 4 characters.</li>
          </ol>
        </div>
        <div className="flex gap-2 lg:flex-col">
          <span className="ui-pill" data-tone="success">{counts.valid} valid</span>
          <span className="ui-pill" data-tone="danger">{counts.invalid} rejected</span>
          <span className="ui-pill" data-tone="neutral">{counts.missing} not set</span>
        </div>
      </div>

      <Table<Developer>
        data={developers}
        columns={columns}
        rowIdKey="developerId"
        title="WakaTime Tokens"
        fileName="WakaTime_Tokens"
        showSearch
        showPagination
        pageSize={15}
        showEditButton={false}
        showDeleteButton={false}
        showActionsColumn={canEdit}
        rowActions={(d) => (
          <>
            <button
              type="button"
              className="ui-btn ui-btn-secondary ui-btn-sm"
              onClick={() => {
                setEditing(d);
                setToken('');
              }}
            >
              <KeyRound className="h-3.5 w-3.5" />
              {d.hasApiKey ? 'Replace' : 'Set token'}
            </button>
            {d.hasApiKey && (
              <button type="button" aria-label="Remove token" data-tip="Remove token" className="ui-btn ui-btn-secondary ui-btn-icon" onClick={() => setRemoveFor(d)}>
                <Trash2 className="!h-3.5 !w-3.5 text-rose-600" />
              </button>
            )}
          </>
        )}
      />

      <DialogComponent
        showDialog={!!editing}
        setShowDialog={(open) => !open && setEditing(null)}
        title={editing?.hasApiKey ? 'Update WakaTime Token' : 'Create WakaTime Token'}
        eyebrow={editing?.developerName}
        description={
          editing?.hasApiKey
            ? `Current token ••••${editing.apiKeyHint} (${STATUS[editing.keyStatus].text.toLowerCase()}). Saving replaces it.`
            : 'The token is checked with WakaTime before it is saved.'
        }
        mode={editing?.hasApiKey ? 'update' : 'create'}
        size="md"
        asForm
        showSaveButton
        saveButtonLabel="Verify & Save"
        onSubmit={save}
      >
        <TokenField value={token} onChange={setToken} required />
      </DialogComponent>

      <ConfirmActionDialog
        open={!!removeFor}
        onClose={() => setRemoveFor(null)}
        onConfirm={remove}
        loading={removing}
        title="Remove token"
        message={`Remove ${removeFor?.developerName}'s WakaTime token? Their activity will not be collected until a new token is saved.`}
        confirmLabel="Yes, Remove"
        confirmColor="bg-red-600 hover:bg-red-700"
      />
    </PageWrapper>
  );
}

export default function WakatimeTokensPage() {
  return (
    <Suspense fallback={null}>
      <TokensScreen />
    </Suspense>
  );
}
