'use client';

import { showAlert } from '@/components/common/AlertHandler';
import { ConfirmActionDialog } from '@/components/common/confirmationDialog';
import DialogComponent from '@/components/layout/dialogComponent';
import InputComponent from '@/components/layout/InputComponent';
import PageWrapper from '@/components/layout/pageWrapper';
import Table, { TableColumn } from '@/components/table';
import { Field } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import {
  useAddRoleMutation,
  useDeleteRoleMutation,
  useGetRolesQuery,
  useUpdateRoleMutation,
} from '@/redux/slice/role';
import { useGetScopesQuery } from '@/redux/slice/scopes';
import { getScopesOnly } from '@/utils/auth';
import { CheckCircle2, Eye, Loader2, Pencil, ShieldCheck, UserRoundCog, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useScopes } from '@/hooks/useScopes';

type RoleColumns = {
  id: number;
  role: string;
  description: string;
  createdAt: string;
};

const Role = () => {
  const { canCreate, canUpdate } = useScopes();
  const [addRole] = useAddRoleMutation();
  const [updateRole] = useUpdateRoleMutation();
  const [deleteRole] = useDeleteRoleMutation();
  const {
    data: roles,
    isLoading: rolesLoading,
    refetch: refetchRoles,
  } = useGetRolesQuery(null, { refetchOnMountOrArgChange: true });
  const { data: scopesData } = useGetScopesQuery(null, {
    refetchOnMountOrArgChange: true,
  });

  const initialFormData = {
    roleId: null as number | null,
    roleName: '' as string,
    description: '' as string,
    permissions: [] as number[],
    removedPermissions: [] as number[],
  };

  const [formData, setFormData] = useState(initialFormData);
  const [initialRowData, setInitialRowData] = useState(initialFormData);

  const [showDialog, setShowDialog] = useState(false);
  const [showSection, setShowSection] = useState<'add' | 'edit' | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [roleRowId, setRoleRowId] = useState<number | null>(null);

  //scopes
  const [scopes, setScopes] = useState<any[]>([]);
  const [viewRole, setViewRole] = useState<any | null>(null);

  // view dialog

  const roleColumns: TableColumn<RoleColumns>[] = [
    { key: 'id', label: 'Id', display: 'excluded' },
    { key: 'role', label: 'Role' },
    { key: 'description', label: 'Description' },
    { key: 'createdAt', label: 'Created Date' },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((formData) => ({
      ...formData,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (id: number) => {
    setFormData((prev) => {
      const exists = prev.permissions?.includes(id);

      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter((permId) => permId !== id) // ❌ remove
          : [...prev.permissions, id], // ✅ add
      };
    });
  };

  const handleEditCheckboxChange = (id: number) => {
    setFormData((prev) => {
      const isActive = prev.permissions.includes(id);

      if (isActive) {
        // 🔴 Remove from active, add to removed
        return {
          ...prev,
          permissions: prev.permissions.filter((permId) => permId !== id),
          removedPermissions: prev.removedPermissions.includes(id)
            ? prev.removedPermissions
            : [...prev.removedPermissions, id],
        };
      } else {
        // 🟢 Add to active, remove from removed
        return {
          ...prev,
          permissions: [...prev.permissions, id],
          removedPermissions: prev.removedPermissions.filter(
            (permId) => permId !== id,
          ),
        };
      }
    });
  };

  // ── Select-All handler ───────────────────────────────────────────────────
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // gather every scope id across all pages
      const allIds = scopes.flatMap((s: any) => s.access.map((a: any) => a.value));
      setFormData((prev) => ({
        ...prev,
        permissions: allIds,
        removedPermissions: [],
      }));
    } else {
      const allIds = scopes.flatMap((s: any) => s.access.map((a: any) => a.value));
      setFormData((prev) => ({
        ...prev,
        permissions: [],
        removedPermissions: allIds,
      }));
    }
  };

  const handleEditOpen = (role: any, index: number) => {
    setFormData({
      ...formData,
      roleId: role.id,
      roleName: role.role,
      description: role.description,
      permissions: role?.scopes?.map((scope: any) => scope.value),
    });

    setInitialRowData({
      ...initialRowData,
      roleId: role.id,
      roleName: role.role,
      description: role.description,
      permissions: role?.scopes?.map((scope: any) => scope.value),
    });

    setShowSection('edit');
    setShowDialog(true);
  };

  const handleAdd = () => {
    setShowSection('add');
    setFormData(initialFormData);
    setShowDialog(true);
  };

  const handleEditRow = (row: any) => {
    const idx = roles?.data.findIndex((item: any) => item.id === row.id);
    if (idx !== -1) handleEditOpen(roles?.data[idx], idx);
  };

  const handleViewRow = (row: any) => {
    const fullRole = roles?.data.find((item: any) => item.id === row.id);
    if (fullRole) setViewRole(fullRole);
  };

  const handleDeleteRole = async (id: number) => {
    try {
      const res = await deleteRole(id);
      if (!res?.error) {
        return showAlert({
          status: 'success',
          message: (res as any)?.data?.msg ?? 'Role deleted successfully',
        });
      } else {
        return showAlert({
          status: 'error',
          message: (res as any)?.error?.data?.msg ?? 'Failed to delete role',
        });
      }
    } catch (error: any) {
      return showAlert({
        status: 'error',
        message: error?.data?.msg ?? 'Failed to delete role',
      });
    }
  };

  const handleDeleteRow = (row: any) => {
    setOpenDialog(true);
    setRoleRowId(row.id);
  };

  const handleAddRole = async (e: any) => {
    e.preventDefault();
    try {
      if (Number(formData?.permissions?.length) === 0) {
        showAlert({
          status: 'error',
          message: 'Please select at least one permission',
        });
        return;
      }

      const roleAlreadyExists = roles?.data?.filter((role: any) => String(role.role).toLowerCase() === String(formData.roleName).toLowerCase())
      if (roleAlreadyExists.length > 0) {
        showAlert({
          status: "error",
          message: "Role already exists",
        });
        return;
      }

      const res = await addRole(formData).unwrap();

      if (!res?.error) {
        showAlert({
          status: 'success',
          message: res?.msg,
        });
        setFormData(initialFormData);
        setShowDialog(false);
        return;
      }

      return showAlert({
        status: 'error',
        message: res?.error?.data?.msg,
      });
    } catch (error: any) {
      console.log(error);
      return showAlert({
        status: 'error',
        message: error?.data?.msg,
      });
    }
  };

  const handleUpdateRole = async (e: any) => {
    e.preventDefault();
    try {
      if (JSON.stringify(formData) === JSON.stringify(initialRowData)) {
        showAlert({
          status: 'error',
          message: 'No changes made',
        });
        return;
      }

      const roleAlreadyExists = roles?.data?.filter((role: any) => String(role.role).toLowerCase() === String(formData.roleName).toLowerCase() && Number(role.id) !== Number(formData.roleId))
      if (roleAlreadyExists.length > 0) {
        showAlert({
          status: "error",
          message: "Role already exists",
        });
        return;
      }

      if (Number(formData?.permissions?.length) === 0) {
        showAlert({
          status: 'error',
          message: 'Please select at least one permission',
        });
        return;
      }

      const res = await updateRole({
        id: Number(formData.roleId),
        data: formData,
      });

      if (!res?.error) {
        showAlert({
          status: 'success', // @ts-ignore
          message: res?.data?.msg,
        });
        setFormData(initialFormData);
        setShowDialog(false);
        return;
      }

      return showAlert({
        status: 'error', // @ts-ignore
        message: res?.error?.data?.msg,
      });
    } catch (error: any) {
      console.log(error);
      return showAlert({
        status: 'error',
        message: error?.data?.message,
      });
    }
  };

  useEffect(() => {
    if (scopesData?.data?.length > 0) {
      const scopesOnly = getScopesOnly(scopesData?.data);
      setScopes(scopesOnly);
    }
  }, [scopesData]);

  return (
    <PageWrapper
      title='Role'
      subtitle='Manage and configure roles'
      showRefreshButton
      showPdfButton
      showBackButton
      titleIcon={<UserRoundCog />}
      onRefresh={() => refetchRoles()}>
      {/* Table Section */}
      {rolesLoading ? (
        <div className='flex items-center justify-center h-full'>
          <Loader2 className='w-8 h-8 animate-spin' />
        </div>
      ) : (
        <>
          <Table<RoleColumns>
            data={roles?.data}
            columns={roleColumns}
            rowIdKey='role'
            title="Roles List"
            subtitle="Manage and configure system roles"
            showSearch
            showFilter
            showExport
            showPrint
            showPagination
            showAddButton={canCreate('role')}
            showEditButton={canUpdate('role')}
            // showDeleteButton
            addButtonLabel='Add Role'
            onAdd={handleAdd}
            onEdit={(row: any) => handleEditRow(row)}
            onDelete={(row: any) => handleDeleteRow(row)}
            rowActions={(row: any) => (
              <button
                type='button'
                aria-label='View access'
                data-tip='View access'
                onClick={() => handleViewRow(row)}
                className='ui-btn ui-btn-secondary ui-btn-icon hover:border-[var(--action)] hover:text-[var(--action)]'>
                <Eye className='!h-3.5 !w-3.5' />
              </button>
            )}
          />

          <DialogComponent
            saveButtonBg={''}
            showDialog={showDialog}
            setShowDialog={setShowDialog}
            title={
              showSection === 'edit' ? 'Update Your Role' : 'Create New Role'
            }
            mode={showSection === 'edit' ? 'update' : 'create'}
            size='xl'
            asForm
            showSaveButton
            onSubmit={
              showSection === 'edit' ? handleUpdateRole : handleAddRole
            }>
            <InputComponent
              name='roleName'
              label='Role Name'
              type='text'
              value={formData.roleName}
              handleChange={handleChange}
              placeholder='Enter your Role Name'
              required
             
            />

            <div className='mt-3'>
              <label className='ui-label'><span className='ui-label-required'>Description</span></label>
              <textarea

                name='description'
                value={formData?.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((formData) => ({
                    ...formData,
                    [e.target.name]: e.target.value,
                  }))
                }
                placeholder='Role Description..'
                className='ui-textarea mt-1.5'
                required
              />
            </div>

            {formData?.roleName && formData?.description && (
              <Field className='mt-4'>
                {/* ── Section header ── */}
                <div className='flex items-center justify-between mb-3'>
                  <Label className='text-sm font-bold text-gray-700 uppercase tracking-wider'>
                    Module Permissions
                  </Label>
                  {/* Select All */}
                  {showSection === 'add' && (
                    <label className='flex items-center gap-2 cursor-pointer select-none'>
                      <div className='relative'>
                        <input
                          type='checkbox'
                          className='sr-only peer'
                          checked={
                            scopes.length > 0 &&
                            scopes.every((s: any) =>
                              s.access.every((a: any) => formData.permissions.includes(a.value))
                            )
                          }
                          onChange={(e) => handleSelectAll(e.target.checked)}
                        />
                        <div className='w-9 h-5 bg-gray-200 peer-checked:bg-emerald-500 rounded-full transition-colors duration-200' />
                        <div className='absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full shadow transition-transform duration-200 peer-checked:translate-x-4' />
                      </div>
                      <span className='text-xs font-bold text-gray-500'>Select All</span>
                    </label>
                  )}
                </div>

                {/* ── Permission matrix table ── */}
                <div className='overflow-x-auto rounded-xl border border-gray-100 shadow-sm'>
                  {(() => {
                    // Collect all unique action names across all pages
                    const allActions = Array.from(
                      new Set(scopes.flatMap((s: any) => s.access.map((a: any) => a.scope)))
                    ) as string[];

                    const onToggle = showSection === 'add' ? handleCheckboxChange : handleEditCheckboxChange;

                    return (
                      <table className='w-full text-left border-separate border-spacing-0'>
                        <thead>
                          <tr className='bg-gray-50'>
                            <th className='px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest w-40 rounded-tl-xl border-b border-gray-100'>
                              Module
                            </th>
                            {allActions.map((action) => (
                              <th
                                key={action}
                                className='px-3 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center border-b border-gray-100 capitalize'
                              >
                                {action}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className='divide-y divide-gray-50'>
                          {scopes.map((section: any, rowIdx: number) => {
                            // map action → access item for this page
                            const accessByScope: Record<string, any> = {};
                            section.access.forEach((a: any) => { accessByScope[a.scope] = a; });

                            return (
                              <tr
                                key={section.page}
                                className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                              >
                                {/* Module name */}
                                <td className='px-4 py-2.5'>
                                  <span className='text-[12px] font-bold text-gray-700 capitalize'>
                                    {section.page}
                                  </span>
                                </td>

                                {/* One cell per action column */}
                                {allActions.map((action) => {
                                  const accessItem = accessByScope[action];
                                  if (!accessItem) {
                                    return (
                                      <td key={action} className='px-3 py-2.5 text-center'>
                                        <span className='text-gray-200 text-sm'>—</span>
                                      </td>
                                    );
                                  }
                                  const isChecked = formData.permissions.includes(accessItem.value);
                                  return (
                                    <td key={action} className='px-3 py-2.5 text-center'>
                                      <button
                                        type='button'
                                        onClick={() => onToggle(accessItem.value)}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border transition-all duration-150 ${isChecked
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm'
                                          : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-300'
                                          }`}
                                      >
                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isChecked ? 'bg-emerald-500' : 'bg-gray-300'
                                          }`} />
                                        {isChecked ? 'On' : 'Off'}
                                      </button>
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>

                {/* Live count */}
                <p className='mt-2 text-right text-[11px] text-gray-400 font-medium'>
                  {formData.permissions.length} permission{formData.permissions.length !== 1 ? 's' : ''} selected
                </p>
              </Field>
            )}
          </DialogComponent>

          {/* ── View Access Dialog ─────────────────────────────────────────── */}
          {viewRole &&
            (() => {
              const grantedValues: number[] = viewRole?.scopes?.map((sc: any) => sc.value) ?? [];
              const grantedCount = scopes.flatMap((sc: any) =>
                sc.access.filter((x: any) => grantedValues.includes(x.value)),
              ).length;
              const totalCount = scopes.flatMap((sc: any) => sc.access).length;
              return (
                <DialogComponent
                  showDialog={!!viewRole}
                  setShowDialog={(open) => {
                    if (!open) setViewRole(null);
                  }}
                  placement='side'
                  size='lg'
                  icon={null}
                  eyebrow='Role access'
                  title={viewRole?.role}
                  description={viewRole?.description || 'No description'}
                  footerActions={[
                    { label: 'Close', variant: 'ghost', onClick: () => setViewRole(null) },
                    {
                      label: 'Edit role',
                      icon: <Pencil />,
                      onClick: () => {
                        const role = viewRole;
                        setViewRole(null);
                        handleEditRow(role);
                      },
                    },
                  ]}
                  bodyClassName='space-y-4'>
                  {/* Role summary */}
                  <section className='flex items-center gap-4 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4'>
                    <span className='flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-theme-primary text-theme-active-text shadow-sm'>
                      <ShieldCheck className='h-6 w-6' />
                    </span>
                    <div className='min-w-0 flex-1'>
                      <p className='truncate font-display text-lg font-bold capitalize text-slate-900'>{viewRole?.role}</p>
                      <p className='text-[12.5px] text-slate-500'>
                        {grantedCount} of {totalCount} permissions granted across {scopes.length} modules
                      </p>
                    </div>
                    <span
                      className='ui-pill'
                      data-tone={grantedCount === totalCount && totalCount > 0 ? 'success' : grantedCount > 0 ? 'warning' : 'danger'}>
                      {totalCount ? Math.round((grantedCount / totalCount) * 100) : 0}%
                    </span>
                  </section>

                  {/* Module permissions */}
                  <section className='ui-card'>
                    <header className='ui-card-head'>
                      <p className='ui-card-title'>Module permissions</p>
                      <span className='flex items-center gap-3 text-[11px] text-slate-500'>
                        <span className='flex items-center gap-1'>
                          <CheckCircle2 className='h-3.5 w-3.5 text-[var(--color-status-running)]' /> Granted
                        </span>
                        <span className='flex items-center gap-1'>
                          <XCircle className='h-3.5 w-3.5 text-slate-300' /> Not granted
                        </span>
                      </span>
                    </header>
                    <ul className='divide-y divide-slate-100'>
                      {scopes.map((section: any) => {
                        const inPage = section.access.filter((x: any) => grantedValues.includes(x.value)).length;
                        return (
                          <li key={section.page} className='flex items-start justify-between gap-3 px-4 py-3'>
                            <div className='min-w-0'>
                              <p className='text-[13px] font-semibold capitalize text-slate-800'>{section.page}</p>
                              <div className='mt-1.5 flex flex-wrap gap-1'>
                                {section.access.map((x: any) => {
                                  const granted = grantedValues.includes(x.value);
                                  return (
                                    <span
                                      key={x.value}
                                      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium capitalize ${
                                        granted
                                          ? 'bg-[color-mix(in_oklab,var(--color-status-running)_12%,white)] text-[color-mix(in_oklab,var(--color-status-running)_75%,black)]'
                                          : 'bg-slate-100 text-slate-400 line-through'
                                      }`}>
                                      {granted ? <CheckCircle2 className='h-3 w-3' /> : <XCircle className='h-3 w-3' />}
                                      {x.scope}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                            <span className='shrink-0 font-mono text-xs text-slate-400 tabular-nums'>
                              {inPage}/{section.access.length}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                </DialogComponent>
              );
            })()}

          {/* Confirmation Dialog */}
          <ConfirmActionDialog
            open={openDialog}
            onClose={() => setOpenDialog(false)}
            onConfirm={() => handleDeleteRole(Number(roleRowId))}
            title="Delete Role"
            message="Are you sure you want to delete this role?"
            confirmLabel="Yes, Delete"
            confirmColor="bg-red-600 hover:bg-red-700"
          />
        </>
      )}
    </PageWrapper>
  );
};
export default Role;
