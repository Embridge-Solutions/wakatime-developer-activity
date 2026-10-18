'use client';

import { useMemo, useState } from 'react';
import { UsersRound } from 'lucide-react';
import PageWrapper from '@/components/layout/pageWrapper';
import Table, { TableColumn } from '@/components/table';
import DialogComponent from '@/components/layout/dialogComponent';
import InputComponent from '@/components/layout/InputComponent';
import { ConfirmActionDialog } from '@/components/common/confirmationDialog';
import { showAlert } from '@/components/common/AlertHandler';
import IdMultiSelect from '@/components/activity/IdMultiSelect';
import { useScopes } from '@/hooks/useScopes';
import { useGetUsersQuery } from '@/redux/slice/user';
import { Team, useAddTeamMutation, useDeleteTeamMutation, useGetTeamsQuery, useUpdateTeamMutation } from '@/redux/slice/team';

const EMPTY = { teamName: '', description: '', isActive: true, memberIds: [] as number[] };

/**
 * Teams (Frontend Developer, Backend Developer, DB Data Analysis …). A user can be
 * in many teams; dashboards and reports filter by team.
 */
export default function TeamsPage() {
  const { canCreate, canUpdate, canDelete } = useScopes();
  const { data, isLoading, refetch } = useGetTeamsQuery();
  const { data: usersData } = useGetUsersQuery(null);
  const [addTeam] = useAddTeamMutation();
  const [updateTeam] = useUpdateTeamMutation();
  const [deleteTeam, { isLoading: deleting }] = useDeleteTeamMutation();

  const [editing, setEditing] = useState<Team | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [toDelete, setToDelete] = useState<Team | null>(null);

  const teams = data?.data ?? [];
  const userOptions = useMemo(
    () =>
      (usersData?.data ?? []).map((u: { id: number; username: string; firstName?: string; lastName?: string }) => ({
        id: u.id,
        label: `${`${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.username} (${u.username})`,
      })),
    [usersData],
  );

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  };
  const openEdit = (t: Team) => {
    setEditing(t);
    setForm({ teamName: t.teamName, description: t.description, isActive: t.isActive, memberIds: t.memberIds });
    setOpen(true);
  };

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const body = { ...form, teamName: form.teamName.trim() };
      const res = editing ? await updateTeam({ id: editing.teamId, data: body }).unwrap() : await addTeam(body).unwrap();
      showAlert({ status: 'success', message: res.msg });
      setOpen(false);
    } catch (err: any) {
      showAlert({ status: 'error', message: err?.data?.msg ?? 'Could not save the team' });
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      const res = await deleteTeam(toDelete.teamId).unwrap();
      showAlert({ status: 'success', message: res.msg });
    } catch (err: any) {
      showAlert({ status: 'error', message: err?.data?.msg ?? 'Could not delete the team' });
    }
    setToDelete(null);
  };

  const columns: TableColumn<Team>[] = [
    { key: 'teamId', label: 'Id', display: 'excluded' },
    {
      key: 'teamName',
      label: 'Team',
      render: (_v, t) => (
        <div>
          <p className="font-semibold text-slate-900">{t.teamName}</p>
          {t.description && <p className="text-[11.5px] text-slate-500">{t.description}</p>}
        </div>
      ),
    },
    { key: 'memberCount', label: 'Members' },
    {
      key: 'memberNames',
      label: 'Who',
      render: (v: string) =>
        v ? (
          <div className="flex max-w-[480px] flex-wrap gap-1">
            {v.split(', ').map((n) => (
              <span key={n} className="ui-chip !h-6 !text-[11.5px]">{n}</span>
            ))}
          </div>
        ) : (
          <span className="text-slate-400">No members</span>
        ),
    },
    {
      key: 'isActive',
      label: 'Status',
      render: (v) => <span className="ui-pill" data-tone={v ? 'success' : 'neutral'}>{v ? 'Active' : 'Inactive'}</span>,
    },
  ];

  return (
    <PageWrapper title="Teams" subtitle="Group users into teams — one user can be in many teams" titleIcon={<UsersRound />} showRefreshButton onRefresh={refetch} noCard>
      <Table<Team>
        data={teams}
        columns={columns}
        rowIdKey="teamId"
        title="Teams"
        fileName="Teams"
        showSearch
        showExport
        showPagination
        pageSize={15}
        showAddButton={canCreate('team')}
        addButtonLabel="Add Team"
        onAdd={openAdd}
        showEditButton={canUpdate('team')}
        onEdit={openEdit}
        showDeleteButton={canDelete('team')}
        onDelete={(t) => setToDelete(t)}
      />
      {isLoading && <p className="mt-2 text-xs text-slate-400">Loading…</p>}

      <DialogComponent
        showDialog={open}
        setShowDialog={setOpen}
        title={editing ? 'Update Team' : 'Create Team'}
        mode={editing ? 'update' : 'create'}
        size="lg"
        asForm
        showSaveButton
        onSubmit={save}
      >
        <div className="space-y-4">
          <InputComponent
            name="teamName"
            label="Team Name"
            value={form.teamName}
            handleChange={(e) => setForm((f) => ({ ...f, teamName: e.target.value }))}
            placeholder="e.g. Backend Developer"
            required
          />
          <div className="ui-field">
            <label htmlFor="teamDescription" className="ui-label">Description</label>
            <textarea
              id="teamDescription"
              className="ui-textarea"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="What this team works on"
            />
          </div>
          <IdMultiSelect
            label="Members"
            options={userOptions}
            value={form.memberIds}
            onChange={(memberIds) => setForm((f) => ({ ...f, memberIds }))}
            placeholder="Choose users"
          />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" className="h-4 w-4" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
            Active (shown in filters and the user form)
          </label>
        </div>
      </DialogComponent>

      <ConfirmActionDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        loading={deleting}
        title="Delete team"
        message={`Delete the team "${toDelete?.teamName}"? Its members leave the team; users and their activity stay.`}
        confirmLabel="Yes, Delete"
        confirmColor="bg-red-600 hover:bg-red-700"
      />
    </PageWrapper>
  );
}
