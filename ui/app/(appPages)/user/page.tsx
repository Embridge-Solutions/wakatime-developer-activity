"use client";

import { showAlert } from "@/components/common/AlertHandler";
import DialogComponent from "@/components/layout/dialogComponent";
import InputComponent from "@/components/layout/InputComponent";
import PageWrapper from "@/components/layout/pageWrapper";
import Table, { TableColumn } from "@/components/table";
import { alertMsgDescription } from "@/config/data-config";
import { useGetRolesQuery } from "@/redux/slice/role";
import { useGetScopesQuery } from "@/redux/slice/scopes";
import {
  useAddUserMutation,
  useDeleteUserMutation,
  useGetUsersQuery,
  useUpdateUserMutation,
} from "@/redux/slice/user";
import {
  CheckCircle2,
  Eye,
  Pencil,
  Mail,
  MapPin,
  Phone,
  Shield,
  ShieldCheck,
  UserRound,
  Users,
  XCircle,
  KeyRound,
  Activity,
  MailPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useScopes } from "@/hooks/useScopes";
import { ConfirmActionDialog } from "@/components/common/confirmationDialog";
import IdMultiSelect from "@/components/activity/IdMultiSelect";
import { useGetTeamsQuery } from "@/redux/slice/team";
import { useSendWelcomeMailMutation } from "@/redux/slice/mail";
import { hasScope } from "@/utils/auth-store";

// ─── Role badge colour map ────────────────────────────────────────────────────
const ROLE_COLORS: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700 border-purple-200",
  manager: "bg-blue-100 text-blue-700 border-blue-200",
  developer: "bg-orange-100 text-orange-700 border-orange-200",
  user: "bg-gray-100 text-gray-600 border-gray-200",
  designer: "bg-pink-100 text-pink-700 border-pink-200",
  tester: "bg-yellow-100 text-yellow-700 border-yellow-200",
};

const getRoleColor = (role: string) => {
  return (
    ROLE_COLORS[role && role?.toLowerCase()] ??
    "bg-indigo-100 text-indigo-700 border-indigo-200"
  );
};

// ─── Avatar ───────────────────────────────────────────────────────────────────
const UserAvatar = ({
  firstName,
  lastName,
}: {
  firstName: string;
  lastName: string;
}) => {
  const initials =
    `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "?";
  const colors = [
    "bg-violet-500",
    "bg-blue-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-cyan-500",
  ];
  const color = colors[(firstName?.charCodeAt(0) ?? 0) % colors.length];
  return (
    <div
      className={`w-8 h-8 rounded-full ${color} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
    >
      {initials}
    </div>
  );
};

// ─── Types ────────────────────────────────────────────────────────────────────
type UserRow = {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  location: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  roles: string[];
  createdAt: string;
  teams?: { teamId: number; teamName: string }[];
  /** WakaTime tracking of this user (developer row in the backend), null = not tracked */
  wakatime?: {
    developerId: number;
    track: boolean;
    developerCode: string;
    designation: string;
    hasApiKey: boolean;
    apiKeyHint: string;
    keyStatus: "NOT_SET" | "VALID" | "INVALID";
    wakaUsername: string;
    lastSyncDate: string | null;
    lastSyncStatus: string;
  } | null;
};

const KEY_TEXT: Record<string, { text: string; tone: string }> = {
  VALID: { text: "Token valid", tone: "success" },
  INVALID: { text: "Token rejected", tone: "danger" },
  NOT_SET: { text: "No token", tone: "warning" },
};

const initialForm = {
  userId: null as number | null,
  firstName: "",
  lastName: "",
  username: "",
  email: "",
  phone: "",
  location: "",
  password: "",
  roleIds: [] as number[],
  removedRoleIds: [] as number[],
  teamIds: [] as number[],
  track: false,
  developerCode: "",
  designation: "",
};

// ─── Page ─────────────────────────────────────────────────────────────────────
const UserPage = () => {
  const router = useRouter();

  const [addUser] = useAddUserMutation();
  const [updateUser] = useUpdateUserMutation();
  const [deleteUser] = useDeleteUserMutation();

  const {
    data: usersData,
    isUninitialized,
    isLoading,
    isSuccess,
    isError,
    error,
    refetch: refetchUsers,
  } = useGetUsersQuery(null, {
    refetchOnMountOrArgChange: false,
  });

  const { data: rolesData } = useGetRolesQuery(null, {
    refetchOnMountOrArgChange: true,
  });
  const { data: scopesData } = useGetScopesQuery(null, {
    refetchOnMountOrArgChange: true,
  });

  const { data: teamsData } = useGetTeamsQuery({ activeOnly: true });
  const teamOptions = (teamsData?.data ?? []).map((t) => ({ id: t.teamId, label: t.teamName }));
  const canEditTokens = hasScope("token_update");
  const [sendWelcome] = useSendWelcomeMailMutation();
  const resendWelcome = async (row: UserRow) => {
    try {
      const res = await sendWelcome(row.id).unwrap();
      showAlert({ status: "success", message: res.msg });
    } catch (err: any) {
      showAlert({ status: "error", message: err?.data?.msg ?? "Welcome mail not sent" });
    }
  };

  const [formData, setFormData] = useState(initialForm);
  const tableRows = useMemo<UserRow[]>(() => usersData?.data ?? [], [usersData]);
  const [initialRowData, setInitialRowData] = useState(initialForm);
  const [showDialog, setShowDialog] = useState(false);
  const [showSection, setShowSection] = useState<"add" | "edit" | null>(null);
  const [viewUser, setViewUser] = useState<any | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [userRowId, setUserRowId] = useState<number | null>(null);

  const { canCreate, canUpdate, canDelete } = useScopes();

  // ── Columns ────────────────────────────────────────────────────────────────
  const userColumns: TableColumn<UserRow>[] = [
    { key: "id", label: "Id", display: "excluded" },
    {
      key: "firstName",
      label: "User",
      render: (_, row) => (
        <div className="flex items-center gap-2.5">
          <UserAvatar firstName={row.firstName} lastName={row.lastName} />
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-gray-900 text-sm truncate">
              {row.firstName} {row.lastName}
            </span>
            <span className="text-xs text-gray-400 truncate">
              @{row.username}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "email",
      label: "Email",
      render: (value, row) => (
        <div className="flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <span className="text-sm text-gray-700 truncate">{value}</span>
          {row.emailVerified && (
            <CheckCircle2
              className="w-3.5 h-3.5 text-green-500 flex-shrink-0"
              //@ts-ignore
              title="Verified"
            />
          )}
        </div>
      ),
    },
    {
      key: "roles",
      label: "Roles",
      render: (value) => {
        // roles is now [{id, role, scopes[]}] from getUniqueUsersWithScopes
        const roles: string[] = Array.isArray(value)
          ? value
              .map((r: any) => (typeof r === "string" ? r : r?.role))
              .filter(Boolean)
          : [];
        if (roles.length === 0)
          return <span className="text-gray-400 text-xs">No role</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {roles.map((r, i) => (
              <span
                key={i}
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full border capitalize ${getRoleColor(r)}`}
              >
                {r}
              </span>
            ))}
          </div>
        );
      },
    },
    // {
    //   key: "emailVerified",
    //   label: "Status",
    //   render: (_, row) => {
    //     const active = row.emailVerified || row.phoneVerified;
    //     return (
    //       <span
    //         className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${active ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-500 border-red-200"}`}
    //       >
    //         {active ? (
    //           <>
    //             <CheckCircle2 className="w-3 h-3" /> Active
    //           </>
    //         ) : (
    //           <>
    //             <XCircle className="w-3 h-3" /> Inactive
    //           </>
    //         )}
    //       </span>
    //     );
    //   },
    // },
    {
      key: "teams",
      label: "Teams",
      render: (_v, row) =>
        row.teams?.length ? (
          <div className="flex min-w-[150px] max-w-[220px] flex-wrap gap-1 whitespace-normal">
            {row.teams.map((t) => (
              <span key={t.teamId} className="ui-chip !h-auto !min-h-6 !whitespace-normal !py-0.5 !text-[11.5px]">{t.teamName}</span>
            ))}
          </div>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        ),
    },
    {
      key: "wakatime",
      label: "WakaTime",
      render: (_v, row) =>
        row.wakatime?.track ? (
          <div className="flex flex-col gap-0.5">
            <span className="ui-pill w-fit" data-tone={KEY_TEXT[row.wakatime.keyStatus]?.tone ?? "neutral"}>
              {KEY_TEXT[row.wakatime.keyStatus]?.text ?? row.wakatime.keyStatus}
            </span>
            {row.wakatime.wakaUsername && <span className="text-[11px] text-slate-500">@{row.wakatime.wakaUsername}</span>}
          </div>
        ) : (
          <span className="text-xs text-gray-400">Not tracked</span>
        ),
    },
    {
      key: "phone",
      label: "Phone",
      render: (value) => (
        <div className="flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <span className="text-sm text-gray-700">{value ?? "—"}</span>
        </div>
      ),
    },
    {
      key: "location",
      label: "Location",
      render: (value) => (
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <span className="text-sm text-gray-700">{value ?? "—"}</span>
        </div>
      ),
    },
    { key: "createdAt", label: "Created At" },
  ];

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleToggle = (roleId: number, isEdit: boolean) => {
    if (!isEdit) {
      setFormData((prev) => ({
        ...prev,
        roleIds: prev.roleIds.includes(roleId)
          ? prev.roleIds.filter((id) => id !== roleId)
          : [...prev.roleIds, roleId],
      }));
      return;
    }
    setFormData((prev) => {
      const active = prev.roleIds.includes(roleId);
      if (active) {
        return {
          ...prev,
          roleIds: prev.roleIds.filter((id) => id !== roleId),
          removedRoleIds: prev.removedRoleIds.includes(roleId)
            ? prev.removedRoleIds
            : [...prev.removedRoleIds, roleId],
        };
      }
      return {
        ...prev,
        roleIds: [...prev.roleIds, roleId],
        removedRoleIds: prev.removedRoleIds.filter((id) => id !== roleId),
      };
    });
  };

  const handleAdd = () => {
    router.push("/user-creation");
  };

  const handleEditOpen = (user: any) => {
    // roles is now [{id, role, scopes[]}] — extract .id
    const roleIds = (user.roles ?? [])
      .map((r: any) => r?.id ?? r?.value ?? r)
      .filter(Boolean);
    const filled = {
      ...initialForm,
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
      phone: user.phone ?? "",
      location: user.location ?? "",
      roleIds,
      teamIds: (user.teams ?? []).map((t: { teamId: number }) => t.teamId),
      track: Boolean(user.wakatime?.track),
      developerCode: user.wakatime?.developerCode ?? "",
      designation: user.wakatime?.designation ?? "",
    };
    setFormData(filled);
    setInitialRowData(filled);
    setShowSection("edit");
    setShowDialog(true);
  };

  const handleEditRow = (row: any) => {
    const full = usersData?.data?.find((u: any) => u.id === row.id);
    if (full) handleEditOpen(full);
  };

  const handleViewRow = (row: any) => {
    const full = usersData?.data?.find((u: any) => u.id === row.id);
    if (full) setViewUser(full);
  };

  const handleAddUser = async (e: any) => {
    e.preventDefault();
    try {
      if (!formData.roleIds.length) {
        return showAlert({
          status: "error",
          message: "Please assign at least one role",
        });
      }
      const res = await addUser(formData).unwrap();
      showAlert({ status: "success", message: res?.msg });
      setShowDialog(false);
      setFormData(initialForm);
    } catch (err: any) {
      showAlert({
        status: "error",
        message: err?.data?.msg ?? "Failed to add user",
      });
    }
  };

  const handleUpdateUser = async (e: any) => {
    e.preventDefault();
    try {
      if (JSON.stringify(formData) === JSON.stringify(initialRowData)) {
        return showAlert({
          status: "error",
          message: alertMsgDescription?.noChangesMade,
        });
      }

      const userAlreadyExists = usersData?.data?.filter(
        (user: any) =>
          String(user.username).toLowerCase() ===
            String(formData.username).toLowerCase() &&
          Number(user.id) !== Number(formData.userId),
      );
      if (userAlreadyExists.length > 0) {
        showAlert({
          status: "error",
          message: "Username already exists",
        });
        return;
      }

      const { teamIds, track, developerCode, designation, ...userFields } = formData;
      const res = await updateUser({
        id: Number(formData.userId),
        data: { ...userFields, teamIds, wakatime: { track, developerCode, designation } },
      });
      if (!res?.error) {
        showAlert({ status: "success", message: (res as any)?.data?.msg });
        setShowDialog(false);
        setFormData(initialForm);
      } else {
        showAlert({
          status: "error",
          message: (res as any)?.error?.data?.msg ?? "Update failed",
        });
      }
    } catch (err: any) {
      showAlert({
        status: "error",
        message: err?.data?.msg ?? "Update failed",
      });
    }
  };

  const handleDelete = async (rowId: number) => {
    try {
      const res = await deleteUser(rowId);
      if (!res?.error) {
        showAlert({
          status: "success",
          message: (res as any)?.data?.msg ?? "User deleted",
        });
        // Second alert: the "account removed" mail to that user (skipped without a valid e-mail)
        const mail = (res as { data?: { mail?: { mailStatus: string; message: string } } })?.data?.mail;
        if (mail?.mailStatus === "Sent") showAlert({ status: "success", message: mail.message });
        else if (mail) showAlert({ status: "warning", message: mail.message });
      } else {
        showAlert({
          status: "error",
          message: (res as any)?.error?.data?.msg ?? "Failed to delete",
        });
      }
    } catch (err: any) {
      showAlert({
        status: "error",
        message: err?.data?.msg ?? "Failed to delete",
      });
    }
  };

  const handleDeleteRow = (row: any) => {
    setOpenDialog(true);
    setUserRowId(row.id);
  };

  return (
    <PageWrapper
      title="Users"
      subtitle="Manage and configure system users"
      showRefreshButton
      showPdfButton
      showBackButton
      titleIcon={<Users />}
      onRefresh={refetchUsers}
      isUninitialized={isUninitialized}
      isLoading={isLoading}
      isSuccess={isSuccess}
      isError={isError}
      error={error}
    >
      <>
        {/* ── Table ────────────────────────────────────────────────────── */}
        <Table<UserRow>
          data={tableRows}
          columns={userColumns}
          rowIdKey="id"
          title="Users List"
          subtitle="Manage and configure system users"
          showSearch
          showFilter
          showExport
          showPrint
          showPagination
          showAddButton={canCreate("user")}
          addButtonLabel="Add User"
          onAdd={handleAdd}
          onEdit={(row: any) => handleEditRow(row)}
          showEditButton={canUpdate("user")}
          onDelete={(row: any) => handleDeleteRow(row)}
          showDeleteButton={canDelete("user")}
          rowActions={(row: any) => (
            <>
              <button
                type="button"
                aria-label="View details"
                data-tip="View"
                onClick={() => handleViewRow(row)}
                className="ui-btn ui-btn-secondary ui-btn-icon hover:border-[var(--action)] hover:text-[var(--action)]"
              >
                <Eye className="!h-3.5 !w-3.5" />
              </button>
              {(canCreate("user") || canUpdate("user")) && row.email && (
                <button
                  type="button"
                  aria-label="Send welcome mail"
                  data-tip="Send welcome mail"
                  onClick={() => resendWelcome(row)}
                  className="ui-btn ui-btn-secondary ui-btn-icon hover:border-[var(--action)] hover:text-[var(--action)]"
                >
                  <MailPlus className="!h-3.5 !w-3.5" />
                </button>
              )}
              {canEditTokens && row.wakatime?.track && (
                <button
                  type="button"
                  aria-label="WakaTime token"
                  data-tip="WakaTime token"
                  onClick={() => router.push(`/wakatime-tokens?developerId=${row.wakatime.developerId}`)}
                  className="ui-btn ui-btn-secondary ui-btn-icon hover:border-[var(--action)] hover:text-[var(--action)]"
                >
                  <KeyRound className="!h-3.5 !w-3.5" />
                </button>
              )}
            </>
          )}
        />

        {/* ── Add / Edit Dialog ─────────────────────────────────────────── */}
        <DialogComponent
          showDialog={showDialog}
          setShowDialog={setShowDialog}
          title={
            showSection === "edit" ? "Update User Details" : "Create New User"
          }
          mode={showSection === "edit" ? "update" : "create"}
          size="xl"
          asForm
          showSaveButton
          onSubmit={showSection === "edit" ? handleUpdateUser : handleAddUser}
        >
          <div className="grid grid-cols-5 gap-5 items-start">
            {/* ── LEFT PANEL: User Info (2/5) ──────────────────────────── */}
            <div className="col-span-2 space-y-4">
              {/* Avatar preview */}
              {(() => {
                const initials =
                  `${formData.firstName?.[0] ?? ""}${formData.lastName?.[0] ?? ""}`.toUpperCase() ||
                  "?";
                const colors = [
                  "bg-violet-500",
                  "bg-blue-500",
                  "bg-emerald-500",
                  "bg-amber-500",
                  "bg-rose-500",
                  "bg-cyan-500",
                ];
                const bg =
                  colors[
                    (formData.firstName?.charCodeAt(0) ?? 0) % colors.length
                  ];
                return (
                  <div className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                    <div
                      className={`w-11 h-11 rounded-full ${bg} flex items-center justify-center text-white text-base font-bold flex-shrink-0`}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 capitalize truncate">
                        {formData.firstName || formData.lastName
                          ? `${formData.firstName} ${formData.lastName}`.trim()
                          : "New User"}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        @{formData.username || "username"}
                      </p>
                    </div>
                    {showSection === "edit" && (
                      <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 border border-blue-200 flex-shrink-0">
                        Editing
                      </span>
                    )}
                  </div>
                );
              })()}

              {/* Fields */}
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <InputComponent
                    name="firstName"
                    label="First Name"
                    type="text"
                    value={formData.firstName}
                    handleChange={handleChange}
                    placeholder="First name"
                    required
                   
                  />
                  <InputComponent
                    name="lastName"
                    label="Last Name"
                    type="text"
                    value={formData.lastName}
                    handleChange={handleChange}
                    placeholder="Last name"
                    required
                   
                  />
                </div>
                <InputComponent
                  name="username"
                  label="Username"
                  type="text"
                  value={formData.username}
                  handleChange={handleChange}
                  placeholder="@username"
                  required
                 
                />
                <InputComponent
                  name="email"
                  label="Email"
                  type="email"
                  value={formData.email}
                  handleChange={handleChange}
                  placeholder="you@company.com"
                  required
                 
                />
                <div className="grid grid-cols-2 gap-2">
                  <InputComponent
                    name="phone"
                    label="Phone"
                    type="tel"
                    value={formData.phone}
                    handleChange={handleChange}
                    placeholder="+91 98765"
                   
                  />
                  <InputComponent
                    name="location"
                    label="Location"
                    type="text"
                    value={formData.location}
                    handleChange={handleChange}
                    placeholder="City, Country"
                   
                  />
                </div>
                {showSection === "add" && (
                  <InputComponent
                    name="password"
                    label="Password"
                    type="password"
                    value={formData.password}
                    handleChange={handleChange}
                    placeholder="Leave blank → Welcome@123"
                   
                  />
                )}
              </div>

              {/* Teams & WakaTime tracking */}
              <div className="space-y-3 rounded-xl border border-slate-200 p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <Activity className="h-3.5 w-3.5" /> Teams &amp; WakaTime
                </p>
                <IdMultiSelect
                  label="Teams"
                  options={teamOptions}
                  value={formData.teamIds}
                  onChange={(teamIds) => setFormData((f) => ({ ...f, teamIds }))}
                  placeholder="Choose teams"
                />
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={formData.track}
                    onChange={(e) => setFormData((f) => ({ ...f, track: e.target.checked }))}
                  />
                  Track this user&apos;s coding activity in WakaTime
                </label>
                {formData.track && (
                  <div className="grid grid-cols-2 gap-3">
                    <InputComponent name="developerCode" label="Employee Code" value={formData.developerCode} handleChange={handleChange} placeholder="Optional" />
                    <InputComponent name="designation" label="Designation" value={formData.designation} handleChange={handleChange} placeholder="e.g. Senior Developer" />
                  </div>
                )}
                {formData.track && (
                  <p className="text-[11.5px] text-slate-500">
                    The WakaTime token is set on the WakaTime Tokens screen (key button in the user list) after saving.
                  </p>
                )}
              </div>

              {/* Selected roles summary */}
              {formData.roleIds.length > 0 && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide mb-1.5">
                    Assigned Roles
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {formData.roleIds.map((id) => {
                      const r = rolesData?.data?.find(
                        (ro: any) => ro.id === id,
                      );
                      if (!r) return null;
                      return (
                        <span
                          key={id}
                          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border capitalize ${getRoleColor(r.role)}`}
                        >
                          {r.role}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ── RIGHT PANEL: Role + Access Preview (3/5) ────────────── */}
            <div className="col-span-3 space-y-3">
              {/* Role selector */}
              <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-default-bg">
                  <Shield className="w-4 h-4 text-white" />
                  <p className="text-sm font-semibold text-white">
                    Assign Roles
                  </p>
                  <span className="ml-auto text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full">
                    {formData.roleIds.length} selected
                  </span>
                </div>

                {/* Role cards */}
                <div className="p-3 grid grid-cols-2 gap-2">
                  {(rolesData?.data ?? []).map((role: any) => {
                    const selected = formData.roleIds.includes(role.id);

                    // Access preview for this role: grantedIds from role.scopes[]
                    const roleGrantedIds: Set<number> = new Set(
                      (role.scopes ?? [])
                        .map((s: any) => s?.value ?? s?.id)
                        .filter(Boolean),
                    );

                    // Build page groups from scopes
                    const pageMap: Record<
                      string,
                      { value: number; action: string }[]
                    > = {};
                    (role.scopes ?? []).forEach((s: any) => {
                      const scopeLabel = s?.label ?? s?.scope ?? "";
                      const [page, action] = scopeLabel.split("_");
                      if (!page || !action) return;
                      if (!pageMap[page]) pageMap[page] = [];
                      pageMap[page].push({ value: s.value ?? s.id, action });
                    });
                    const pageCount = Object.keys(pageMap).length;
                    const permCount = (role.scopes ?? []).filter(
                      (s: any) => s?.value ?? s?.id,
                    ).length;

                    return (
                      <div
                        key={role.id}
                        onClick={() =>
                          handleRoleToggle(role.id, showSection === "edit")
                        }
                        className={`group relative flex flex-col gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all select-none ${
                          selected
                            ? "bg-emerald-50 shadow-sm"
                            : "border-gray-200 bg-white hover:bg-indigo-50/30"
                        }`}
                      >
                        {/* Role header */}
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                              selected
                                ? "bg-emerald-500 border-emerald-500"
                                : "border-gray-300 group-hover:border-indigo-400"
                            }`}
                          >
                            {selected && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                            )}
                          </div>
                          <p
                            className={`text-sm font-bold capitalize flex-1 truncate ${
                              selected ? "text-emerald-700" : "text-gray-700"
                            }`}
                          >
                            {role.role}
                          </p>
                          <span
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border capitalize flex-shrink-0 ${getRoleColor(role.role)}`}
                          >
                            {role.role}
                          </span>
                        </div>

                        {/* Mini access strip */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-gray-400">
                            {pageCount} modules
                          </span>
                          <span className="text-gray-200">·</span>
                          <span className="text-[9px] text-gray-400">
                            {permCount} permissions
                          </span>
                          {selected && (
                            <span className="ml-auto text-[9px] font-semibold text-emerald-600">
                              ✓ Assigned
                            </span>
                          )}
                        </div>

                        {/* Expanded permission dots when selected */}
                        {selected && Object.entries(pageMap).length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1 border-t border-emerald-200">
                            {Object.entries(pageMap)
                              .slice(0, 3)
                              .map(([page, perms]) => (
                                <span
                                  key={page}
                                  className="text-[9px] font-medium px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full capitalize"
                                >
                                  {page} ({perms.length})
                                </span>
                              ))}
                            {Object.keys(pageMap).length > 3 && (
                              <span className="text-[9px] text-gray-400">
                                +{Object.keys(pageMap).length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Access preview for selected roles combined */}
              {formData.roleIds.length > 0 &&
                (() => {
                  // Collect all granted scope IDs from selected roles
                  const selectedRoleObjs = (rolesData?.data ?? []).filter(
                    (r: any) => formData.roleIds.includes(r.id),
                  );
                  const grantedIds: Set<number> = new Set(
                    selectedRoleObjs.flatMap((r: any) =>
                      (r.scopes ?? [])
                        .map((s: any) => s?.value ?? s?.id)
                        .filter(Boolean),
                    ),
                  );

                  // Build page list from scopesData
                  const allPages: {
                    page: string;
                    access: { value: number; scope: string }[];
                  }[] = scopesData?.data?.length
                    ? (() => {
                        const grouped: Record<
                          string,
                          { value: number; scope: string }[]
                        > = {};
                        scopesData.data.forEach((s: any) => {
                          const [page, action] = (s.scope ?? "").split("_");
                          if (!page || !action) return;
                          if (!grouped[page]) grouped[page] = [];
                          grouped[page].push({ value: s.id, scope: action });
                        });
                        return Object.entries(grouped).map(
                          ([page, access]) => ({ page, access }),
                        );
                      })()
                    : [];

                  const totalScopes = allPages.reduce(
                    (n, p) => n + p.access.length,
                    0,
                  );
                  const grantedCount = grantedIds.size;

                  return (
                    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                      {/* Header */}
                      <div className="flex items-center justify-between px-4 py-2.5 bg-default-bg">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-white" />
                          <p className="text-sm font-semibold text-white">
                            Effective Access
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              grantedCount === totalScopes && totalScopes > 0
                                ? "bg-green-400 text-white"
                                : grantedCount > 0
                                  ? "bg-yellow-400 text-white"
                                  : "bg-red-400 text-white"
                            }`}
                          >
                            {grantedCount}/{totalScopes}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] text-white/70">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />{" "}
                            Granted
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] text-white/70">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />{" "}
                            Not granted
                          </span>
                        </div>
                      </div>
                      {/* Grid */}
                      <div className="p-3 grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto [&::-webkit-scrollbar]:hidden">
                        {allPages.map(({ page, access }) => {
                          const grantedInPage = access.filter((a) =>
                            grantedIds.has(a.value),
                          ).length;
                          return (
                            <div
                              key={page}
                              className="bg-gray-50 border border-gray-100 rounded-xl p-2.5"
                            >
                              <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-gray-100">
                                <p className="text-[11px] font-bold text-gray-700 capitalize">
                                  {page}
                                </p>
                                <span
                                  className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                                    grantedInPage === access.length
                                      ? "bg-green-100 text-green-600"
                                      : grantedInPage > 0
                                        ? "bg-yellow-100 text-yellow-600"
                                        : "bg-red-100 text-red-500"
                                  }`}
                                >
                                  {grantedInPage}/{access.length}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {access.map((a) => {
                                  const granted = grantedIds.has(a.value);
                                  return (
                                    <span
                                      key={a.value}
                                      className={`inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                                        granted
                                          ? "bg-green-100 text-green-700 border border-green-200"
                                          : "bg-red-50 text-red-500 border border-red-200"
                                      }`}
                                    >
                                      <span
                                        className={`w-1 h-1 rounded-full ${granted ? "bg-green-500" : "bg-red-400"}`}
                                      />
                                      {a.scope}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
            </div>
          </div>
        </DialogComponent>

        {/* ── View User Dialog ──────────────────────────────────────────── */}
        {viewUser && (() => {
          // Granted scope IDs from roles[].scopes[].id
          const grantedIds: Set<number> = new Set(
            (viewUser.roles ?? []).flatMap((r: any) =>
              (r?.scopes ?? []).map((sc: any) => sc?.id).filter(Boolean),
            ),
          );
          // Every page → its actions, from the scope master
          const grouped: Record<string, { value: number; scope: string }[]> = {};
          (scopesData?.data ?? []).forEach((sc: any) => {
            const [page, action] = (sc.scope ?? "").split("_");
            if (!page || !action) return;
            (grouped[page] ??= []).push({ value: sc.id, scope: action });
          });
          const allPages = Object.entries(grouped).map(([page, access]) => ({ page, access }));
          const totalScopes = allPages.reduce((n, p) => n + p.access.length, 0);
          const grantedCount = grantedIds.size;
          const roleNames: string[] = (viewUser.roles ?? [])
            .map((r: any) => (typeof r === "string" ? r : r?.role))
            .filter(Boolean);
          const isActive = viewUser.emailVerified || viewUser.phoneVerified;
          const initials =
            `${viewUser.firstName?.[0] ?? ""}${viewUser.lastName?.[0] ?? ""}`.toUpperCase() || "?";

          return (
            <DialogComponent
              showDialog={!!viewUser}
              setShowDialog={(open) => {
                if (!open) setViewUser(null);
              }}
              placement="side"
              size="lg"
              icon={null}
              eyebrow="User profile"
              title={`${viewUser.firstName ?? ""} ${viewUser.lastName ?? ""}`.trim() || viewUser.username}
              description={`@${viewUser.username}`}
              footerActions={[
                { label: "Close", variant: "ghost", onClick: () => setViewUser(null) },
                {
                  label: "Edit user",
                  icon: <Pencil />,
                  onClick: () => {
                    const user = viewUser;
                    setViewUser(null);
                    handleEditOpen(user);
                  },
                },
              ]}
              bodyClassName="space-y-4"
            >
              {/* Profile */}
              <section className="flex items-center gap-4 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-theme-primary font-display text-lg font-bold text-theme-active-text shadow-sm">
                  {initials}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="ui-pill" data-tone={isActive ? "success" : "danger"}>
                      {isActive ? "Active" : "Inactive"}
                    </span>
                    {roleNames.map((r) => (
                      <span
                        key={r}
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${getRoleColor(r)}`}
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                  <p className="mt-1.5 truncate text-[13px] text-slate-500">{viewUser.email || "No email"}</p>
                </div>
              </section>

              {/* Contact */}
              <section className="ui-card">
                <header className="ui-card-head">
                  <p className="ui-card-title flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-slate-400" /> Contact
                  </p>
                </header>
                <dl className="ui-kv ui-card-body">
                  {[
                    { label: "Username", value: viewUser.username },
                    { label: "Email", value: viewUser.email },
                    { label: "Phone", value: viewUser.phone },
                    { label: "Location", value: viewUser.location },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd className={value ? "" : "text-slate-400"}>{value || "—"}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              {/* Teams & WakaTime */}
              <section className="ui-card">
                <header className="ui-card-head">
                  <p className="ui-card-title flex items-center gap-2">
                    <Activity className="h-4 w-4 text-slate-400" /> Teams &amp; WakaTime
                  </p>
                </header>
                <dl className="ui-kv ui-card-body">
                  <div>
                    <dt>Teams</dt>
                    <dd className={viewUser.teams?.length ? "" : "text-slate-400"}>
                      {viewUser.teams?.length ? viewUser.teams.map((t: { teamName: string }) => t.teamName).join(", ") : "No team"}
                    </dd>
                  </div>
                  <div>
                    <dt>WakaTime</dt>
                    <dd>
                      {viewUser.wakatime?.track
                        ? `${KEY_TEXT[viewUser.wakatime.keyStatus]?.text ?? viewUser.wakatime.keyStatus}${viewUser.wakatime.hasApiKey ? ` · ••••${viewUser.wakatime.apiKeyHint}` : ""}${viewUser.wakatime.wakaUsername ? ` · @${viewUser.wakatime.wakaUsername}` : ""}`
                        : "Not tracked"}
                    </dd>
                  </div>
                  {viewUser.wakatime?.track && (
                    <div>
                      <dt>Employee code · Designation</dt>
                      <dd>{[viewUser.wakatime.developerCode, viewUser.wakatime.designation].filter(Boolean).join(" · ") || "—"}</dd>
                    </div>
                  )}
                </dl>
              </section>

              {/* Access permissions */}
              <section className="ui-card">
                <header className="ui-card-head">
                  <p className="ui-card-title flex items-center gap-2">
                    <Shield className="h-4 w-4 text-slate-400" /> Access permissions
                  </p>
                  <span
                    className="ui-pill"
                    data-tone={
                      grantedCount === totalScopes && totalScopes > 0 ? "success" : grantedCount > 0 ? "warning" : "danger"
                    }
                  >
                    {grantedCount}/{totalScopes} granted
                  </span>
                </header>
                {allPages.length === 0 ? (
                  <p className="ui-card-body text-sm text-slate-400">No permissions configured.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {allPages.map(({ page, access }) => {
                      const grantedInPage = access.filter((x) => grantedIds.has(x.value)).length;
                      return (
                        <li key={page} className="flex items-start justify-between gap-3 px-4 py-3">
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold capitalize text-slate-800">{page}</p>
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {access.map((x) => {
                                const granted = grantedIds.has(x.value);
                                return (
                                  <span
                                    key={x.value}
                                    className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium capitalize ${
                                      granted
                                        ? "bg-[color-mix(in_oklab,var(--color-status-running)_12%,white)] text-[color-mix(in_oklab,var(--color-status-running)_75%,black)]"
                                        : "bg-slate-100 text-slate-400 line-through"
                                    }`}
                                  >
                                    {granted ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                    {x.scope}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                          <span className="shrink-0 font-mono text-xs text-slate-400 tabular-nums">
                            {grantedInPage}/{access.length}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </DialogComponent>
          );
        })()}
      </>

      {/* Confirmation Dialog */}
      <ConfirmActionDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        onConfirm={() => handleDelete(Number(userRowId))}
        title="Delete User"
        message="Are you sure you want to delete this user?"
        confirmLabel="Yes, Delete"
        confirmColor="bg-red-600 hover:bg-red-700"
      />
    </PageWrapper>
  );
};

export default UserPage;
