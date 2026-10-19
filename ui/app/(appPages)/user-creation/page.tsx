'use client';

import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import StepConnector, {
  stepConnectorClasses,
} from '@mui/material/StepConnector';
import { StepIconProps } from '@mui/material/StepIcon';
import { styled } from '@mui/material/styles';
import PageWrapper from '@/components/layout/pageWrapper';
import { showAlert } from '@/components/common/AlertHandler';
import { useGetRolesQuery } from '@/redux/slice/role';
import { useAddUserMutation, useGetUsersQuery } from '@/redux/slice/user';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardList,
  Copy,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Shield,
  ShieldCheck,
  User,
  UserPlus,
  UserRoundCheck,
  UserRoundPlus,
  UserRoundSearch,
  Venus,
  Activity,
  Users,
} from 'lucide-react';
import { useGetScopesQuery } from '@/redux/slice/scopes';
import RecordedBy, { useLoginUserName } from '@/components/common/RecordedBy';
import IdMultiSelect from '@/components/activity/IdMultiSelect';
import TokenField from '@/components/activity/TokenField';
import PasswordInput from '@/components/activity/PasswordInput';
import { useGetTeamsQuery } from '@/redux/slice/team';

// ─── Stepper style ─────────────────────────────────────────────────────────────
const ColorlibConnector = styled(StepConnector)(() => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: { top: 22 },
  [`&.${stepConnectorClasses.active} .${stepConnectorClasses.line},
    &.${stepConnectorClasses.completed} .${stepConnectorClasses.line}`]: {
    background: 'linear-gradient(90deg, rgb(31,41,57), var(--action))',
  },
  [`& .${stepConnectorClasses.line}`]: {
    height: 3,
    borderRadius: 9999,
    backgroundColor: '#e2e8f0',
  },
}));

const ColorlibStepIconRoot = styled('div')<{
  ownerState: { active?: boolean; completed?: boolean };
}>(({ ownerState }) => ({
  width: 48,
  height: 48,
  borderRadius: '9999px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#e2e8f0',
  color: '#94a3b8',
  zIndex: 1,
  transition: 'all 0.3s',
  ...(ownerState.active && {
    background: 'linear-gradient(135deg, rgb(31,41,57) 0%, var(--action) 100%)',
    color: '#ffffff',
    boxShadow: '0 4px 14px var(--action-soft)',
  }),
  ...(ownerState.completed && {
    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
    color: '#ffffff',
    boxShadow: '0 4px 14px rgba(5,150,105,0.35)',
  }),
}));

function ColorlibStepIcon(props: StepIconProps) {
  const { active, completed, className, icon } = props;
  const icons: Record<string, React.ReactElement> = {
    1: <UserRoundPlus className='w-5 h-5' />,
    2: <UserRoundCheck className='w-5 h-5' />,
    3: <UserRoundSearch className='w-5 h-5' />,
  };
  return (
    <ColorlibStepIconRoot
      ownerState={{ active, completed }}
      className={className}>
      {completed ? <CheckCircle2 className='w-5 h-5' /> : icons[String(icon)]}
    </ColorlibStepIconRoot>
  );
}

const STEPS = ['User Details', 'Assign Role', 'Teams & WakaTime', 'Review & Create'];

// ─── Role badge colours ────────────────────────────────────────────────────────
const getRoleColor = (role: string) => {
  const map: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-700 border-purple-200',
    manager: 'bg-blue-100 text-blue-700 border-blue-200',
    developer: 'bg-orange-100 text-orange-700 border-orange-200',
    user: 'bg-gray-100 text-gray-600 border-gray-200',
  };
  return (
    map[role?.toLowerCase()] ??
    'bg-indigo-100 text-indigo-700 border-indigo-200'
  );
};

// ─── Section card ──────────────────────────────────────────────────────────────
const SectionCard = ({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
}) => (
  <div className='mb-5'>
    <div className='flex items-center gap-2 mb-3'>
      <div
        className='w-7 h-7 rounded-lg flex items-center justify-center'
        style={{ backgroundColor: 'var(--action-soft)' }}>
        <Icon className='w-4 h-4' style={{ color: 'var(--action)' }} />
      </div>
      <h3 className='text-sm font-semibold text-gray-700'>{title}</h3>
    </div>
    {children}
  </div>
);

// ─── Field input wrapper ───────────────────────────────────────────────────────
const FieldGroup = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className='space-y-1.5'>
    <label className='text-xs font-semibold text-gray-500 uppercase tracking-wide block'>
      {label}
    </label>
    {children}
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────
const UserCreationPage = () => {
  const [addUser] = useAddUserMutation();
  const { data: usersData } = useGetUsersQuery(null, {
    refetchOnMountOrArgChange: false,
  });
  const { data: rolesData, isLoading: rolesLoading } = useGetRolesQuery(null, {
    refetchOnMountOrArgChange: false,
  });
  const { data: scopeData } = useGetScopesQuery(null, {
    refetchOnMountOrArgChange: false,
  });

  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const [gender, setGender] = useState('');
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [previewRoleId, setPreviewRoleId] = useState<number | null>(null);
  // Teams & WakaTime (step 3) — the developer side is created in the backend with the user
  const { data: teamsData } = useGetTeamsQuery({ activeOnly: true });
  const teamOptions = (teamsData?.data ?? []).map((t) => ({ id: t.teamId, label: t.teamName }));
  const EMPTY_WAKA = { teamIds: [] as number[], track: true, developerCode: '', designation: '', apiKey: '', confirmPassword: '' };
  const [waka, setWaka] = useState(EMPTY_WAKA);
  // "Created By" input — starts as the logged-in user; the footer follows what's typed
  const loginName = useLoginUserName();
  const [createdByInput, setCreatedByInput] = useState<string | null>(null);
  const createdBy = createdByInput ?? loginName;
  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const toggleRole = (id: number) =>
    setSelectedRoleIds((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );

  // ── Validation ──────────────────────────────────────────────────────────────
  const isStep0Valid = () =>
    formData.username.trim() &&
    formData.firstName.trim() &&
    formData.lastName.trim() &&
    formData.email.trim() &&
    formData.phone.trim() &&
    formData.location.trim();

  const isStep1Valid = () => selectedRoleIds.length > 0;

  // ── Navigation ──────────────────────────────────────────────────────────────
  const handleNext = async () => {
    if (activeStep === 0) {
      const userAlreadyExists = usersData?.data?.filter(
        (user: any) =>
          String(user.username).toLowerCase() ===
          String(formData.username).toLowerCase(),
      );
      if (userAlreadyExists.length > 0) {
        showAlert({
          status: 'error',
          message: 'Username already exists',
        });
        return;
      }
      if (!isStep0Valid()) {
        formRef.current?.reportValidity();

        showAlert({
          status: 'error',
          message: 'Please fill all fields',
        });
        return;
      }
      setActiveStep(1);
      // Auto-preview first role when entering step 1
      const firstRole = rolesData?.data?.[0];
      if (firstRole) setPreviewRoleId(firstRole.id);
    } else if (activeStep === 1) {
      if (!isStep1Valid()) {
        showAlert({
          status: 'error',
          message: 'Please assign at least one role.',
        });
        return;
      }
      setActiveStep(2);
    } else if (activeStep === 2) {
      if (waka.track && waka.apiKey.trim() && !waka.confirmPassword) {
        showAlert({ status: 'error', message: 'Enter the token protection password to save the WakaTime token.' });
        return;
      }
      setActiveStep(3);
    } else if (activeStep === 3) {
      await handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        gender: gender.toLowerCase(),
        roleIds: selectedRoleIds,
        teamIds: waka.teamIds,
        wakatime: {
          track: waka.track,
          developerCode: waka.developerCode,
          designation: waka.designation,
          apiKey: waka.apiKey.trim() || undefined,
          confirmPassword: waka.apiKey.trim() ? waka.confirmPassword : undefined,
        },
      };
      const res = await addUser(payload);
      if (!res?.error) {
        showAlert({ status: 'success', message: (res as any)?.data?.msg });
        // e.g. the developer's WakaTime timezone isn't Asia/Kolkata
        if ((res as any)?.data?.warning) showAlert({ status: 'warning', message: (res as any).data.warning });
        // Welcome mail with the next steps (Settings › Welcome Mail)
        const mail = (res as any)?.data?.mail as { status: string; message: string } | undefined;
        if (mail) showAlert({ status: mail.status === 'SENT' ? 'success' : 'warning', message: mail.message });
        setIsDone(true);
        return;
      }

      return showAlert({
        status: 'error',
        message: (res as any)?.error?.data?.msg,
      });
    } catch (err: any) {
      showAlert({ status: 'error', message: err?.data?.msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      username: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      location: '',
      password: '',
    });
    setGender('');
    setSelectedRoleIds([]);
    setWaka(EMPTY_WAKA);
    setCreatedByInput(null);
    setActiveStep(0);
    setIsDone(false);
  };

  // ── Derived ─────────────────────────────────────────────────────────────────
  const selectedRoles =
    rolesData?.data?.filter((r: any) => selectedRoleIds.includes(r.id)) ?? [];

  return (
    <PageWrapper
      title='Create User'
      subtitle='Add a new user in 4 steps — login, role, teams and WakaTime tracking'
      showBackButton
      showRefreshButton
      titleIcon={<UserPlus />}>
      <form ref={formRef} onSubmit={(e) => e.preventDefault()} noValidate>
        {/* ── Stepper ──────────────────────────────────────────────────── */}
        <div className='px-2 pt-2 pb-6'>
          <Stepper
            alternativeLabel
            activeStep={activeStep}
            connector={<ColorlibConnector />}>
            {STEPS.map((label, index) => (
              <Step key={label}>
                <StepLabel StepIconComponent={ColorlibStepIcon}>
                  <span
                    className='text-xs font-semibold'
                    style={{
                      color: activeStep === index ? 'var(--action)' : '#4b5563',
                    }}>
                    {label}
                  </span>
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </div>

        {/* ── Step content ─────────────────────────────────────────────── */}
        <div className='px-2 pb-4 min-h-[340px]'>
          {/* STEP 0 — User Details */}
          {activeStep === 0 && (
            <div className='animate-in fade-in slide-in-from-right-4 duration-300'>
              <form onSubmit={handleSubmit}>
                {/* Personal info */}
                <SectionCard title='Personal Information' icon={User}>
                  <div className='grid grid-cols-2 gap-4'>
                    {[
                      {
                        label: 'First Name',
                        name: 'firstName',
                        placeholder: 'Enter first name',
                        type: 'text',
                      },
                      {
                        label: 'Last Name',
                        name: 'lastName',
                        placeholder: 'Enter last name',
                        type: 'text',
                      },
                      {
                        label: 'Username',
                        name: 'username',
                        placeholder: 'Enter username',
                        type: 'text',
                      },
                      {
                        label: 'Password',
                        name: 'password',
                        type: 'password',
                        placeholder: 'Leave blank for Welcome@123',
                      },
                    ].map((f) => (
                      <FieldGroup key={f.name} label={f.label}>
                        <Input
                          type={f.type ?? 'text'}
                          name={f.name}
                          value={(formData as any)[f.name]}
                          onChange={handleChange}
                          placeholder={f.placeholder}
                          required
                          className='bg-gray-50 border border-gray-200 h-10 text-sm rounded-lg focus:border-action focus:ring-1 focus:ring-action-soft transition'
                        />
                      </FieldGroup>
                    ))}
                  </div>
                </SectionCard>

                {/* Gender */}
                {/* <SectionCard title="Gender" icon={Venus}>
                  <div className="flex gap-6">
                    {["male", "female"].map((val) => (
                      <label
                        key={val}
                        className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl border-2 cursor-pointer transition-all select-none ${gender === val
                            ? "border-default-bg bg-default-bg/5 text-default-bg"
                            : "border-gray-200 text-gray-500 hover:border-gray-300"
                          }`}
                      >
                        <input
                          type="radio"
                          name="gender"
                          value={val}
                          checked={gender === val}
                          onChange={(e) => setGender(e.target.value)}
                          className="sr-only"
                        />
                        <span
                          className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${gender === val ? "border-default-bg" : "border-gray-400"}`}
                        >
                          {gender === val && (
                            <span className="w-2 h-2 bg-default-bg rounded-full" />
                          )}
                        </span>
                        <span className="text-sm font-medium capitalize">
                          {val}
                        </span>
                      </label>
                    ))}
                  </div>
                </SectionCard> */}

                {/* Contact */}
                <SectionCard title='Contact & Location' icon={Mail}>
                  <div className='grid grid-cols-3 gap-4'>
                    {[
                      {
                        label: 'Email',
                        name: 'email',
                        type: 'email',
                        icon: Mail,
                        placeholder: 'you@company.com',
                      },
                      {
                        label: 'Phone',
                        name: 'phone',
                        type: 'number',
                        icon: Phone,
                        placeholder: '+91 98765 43210',
                      },
                      {
                        label: 'Location',
                        name: 'location',
                        type: 'text',
                        icon: MapPin,
                        placeholder: 'City, Country',
                      },
                    ].map((f) => (
                      <FieldGroup key={f.name} label={f.label}>
                        <div className='relative'>
                          <f.icon className='absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400' />
                          <Input
                            type={f.type ?? 'text'}
                            name={f.name}
                            value={(formData as any)[f.name]}
                            onChange={handleChange}
                            placeholder={f.placeholder}
                            className='pl-9 bg-gray-50 border border-gray-200 h-10 text-sm rounded-lg focus:border-action focus:ring-1 focus:ring-action-soft transition'
                          />
                        </div>
                      </FieldGroup>
                    ))}
                  </div>
                </SectionCard>
              </form>
            </div>
          )}

          {/* STEP 1 — Assign Role */}
          {activeStep === 1 && (
            <div className='animate-in fade-in slide-in-from-right-4 duration-300'>
              <div className='grid grid-cols-5 gap-4 items-start'>
                {/* ── LEFT: Role selector cards (2/5 width) ────────────── */}
                <div className='col-span-2'>
                  <SectionCard title='Select Roles' icon={Shield}>
                    {rolesLoading ? (
                      <div className='flex items-center justify-center py-10'>
                        <Loader2 className='w-6 h-6 animate-spin text-gray-400' />
                      </div>
                    ) : (
                      <div className='flex flex-col gap-2'>
                        {rolesData?.data?.map((role: any) => {
                          const selected = selectedRoleIds.includes(role.id);
                          const previewing = previewRoleId === role.id;
                          return (
                            <div
                              key={role.id}
                              onMouseEnter={(e) => {
                                setPreviewRoleId(role.id);
                                if (!selected) {
                                  e.currentTarget.style.borderColor =
                                    'var(--theme-glow-border)';
                                  e.currentTarget.style.backgroundColor =
                                    'var(--action-soft)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                setPreviewRoleId(selectedRoleIds[0] ?? null);
                                if (!selected) {
                                  e.currentTarget.style.borderColor = '';
                                  e.currentTarget.style.backgroundColor = '';
                                }
                              }}
                              onClick={() => setPreviewRoleId(role.id)}
                              className={`group flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all select-none ${selected ? 'bg-emerald-50 border-emerald-200' : 'border-gray-200 bg-white'}`}
                              style={
                                previewing && !selected
                                  ? {
                                      borderColor: 'var(--theme-glow-border)',
                                      backgroundColor: 'var(--action-soft)',
                                    }
                                  : {}
                              }>
                              {/* Checkbox */}
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleRole(role.id);
                                }}
                                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                  selected
                                    ? 'bg-emerald-500 border-emerald-500'
                                    : 'border-gray-300 group-hover:border-action'
                                }`}>
                                {selected && (
                                  <CheckCircle2 className='w-3.5 h-3.5 text-white' />
                                )}
                              </div>

                              {/* Role info */}
                              <div className='min-w-0 flex-1'>
                                <p
                                  className={`text-sm font-semibold capitalize truncate ${selected ? 'text-emerald-700' : 'text-gray-700'}`}
                                  style={
                                    previewing && !selected
                                      ? { color: 'var(--action)' }
                                      : {}
                                  }>
                                  {role.role}
                                </p>
                                <p className='text-[10px] text-gray-400 mt-0.5 truncate'>
                                  {role.scopes?.filter((s: any) => s?.label)
                                    ?.length ?? 0}{' '}
                                  permissions
                                </p>
                              </div>

                              {/* Badge */}
                              <span
                                className={`text-[10px] font-medium px-2 py-0.5 rounded-full border capitalize flex-shrink-0 ${getRoleColor(role.role)}`}>
                                {role.role}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Selected summary */}
                    {selectedRoles.length > 0 && (
                      <div className='mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl'>
                        <p className='text-[10px] font-semibold text-emerald-700 uppercase tracking-wide mb-1.5'>
                          Selected
                        </p>
                        <div className='flex flex-wrap gap-1.5'>
                          {selectedRoles.map((r: any) => (
                            <span
                              key={r.id}
                              className={`text-[11px] font-medium px-2 py-0.5 rounded-full border capitalize ${getRoleColor(r.role)}`}>
                              {r.role}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </SectionCard>
                </div>

                {/* ── RIGHT: Access preview panel (3/5 width) ──────────── */}
                <div className='col-span-3 sticky top-0 mt-10'>
                  {previewRoleId ? (
                    (() => {
                      const role = rolesData?.data?.find(
                        (r: any) => r.id === previewRoleId,
                      );
                      if (!role) return null;

                      // Role's granted scope IDs
                      const grantedIds: Set<number> = new Set(
                        role.scopes?.map((s: any) => s.value).filter(Boolean) ??
                          [],
                      );

                      // Build master page list from ALL scopeData
                      const allPages: {
                        page: string;
                        access: { value: number; scope: string }[];
                      }[] = scopeData?.data?.length
                        ? (() => {
                            const grouped: Record<
                              string,
                              { value: number; scope: string }[]
                            > = {};
                            scopeData.data.forEach((s: any) => {
                              const [page, action] = (s.scope ?? '').split('_');
                              if (!page || !action) return;
                              if (!grouped[page]) grouped[page] = [];
                              grouped[page].push({
                                value: s.id,
                                scope: action,
                              });
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
                      const grantedCount = allPages.reduce(
                        (n, p) =>
                          n +
                          p.access.filter((a) => grantedIds.has(a.value))
                            .length,
                        0,
                      );
                      const isSelected = selectedRoleIds.includes(role.id);

                      return (
                        <div
                          className={`rounded-2xl border-2 overflow-hidden transition-all ${isSelected ? ' shadow-md ' : ' shadow-md shadow-indigo-100'}`}>
                          {/* Panel header */}
                          <div
                            className='px-4 py-3 flex items-center justify-between'
                            style={
                              isSelected
                                ? { backgroundColor: '#10b981' }
                                : { backgroundColor: 'var(--action)' }
                            }>
                            <div className='flex items-center gap-2.5'>
                              <div className='w-8 h-8 rounded-full bg-white/20 flex items-center justify-center'>
                                <ShieldCheck className='w-4 h-4 text-white' />
                              </div>
                              <div>
                                <p className='text-sm font-bold text-white capitalize'>
                                  {role.role}
                                </p>
                                <p className='text-[10px] text-white/70 mt-0.5'>
                                  {grantedCount}/{totalScopes} permissions
                                  granted
                                </p>
                              </div>
                            </div>
                            {/* Toggle button */}
                            <button
                              type='button'
                              onClick={() => toggleRole(role.id)}
                              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                                isSelected
                                  ? 'bg-white/20 border-white/30 text-white hover:bg-white/30'
                                  : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                              }`}>
                              {isSelected ? (
                                <>
                                  <CheckCircle2 className='w-3.5 h-3.5' />{' '}
                                  Selected
                                </>
                              ) : (
                                <>+ Assign</>
                              )}
                            </button>
                          </div>

                          {/* Scopes grid — all pages from scopeData, green=granted, red=not granted */}
                          <div className='p-4 bg-white'>
                            {allPages.length === 0 ? (
                              <p className='text-sm text-gray-400 text-center py-6'>
                                No permissions configured.
                              </p>
                            ) : (
                              <>
                                {/* Legend */}
                                <div className='flex items-center gap-3 mb-3'>
                                  <p className='text-[10px] font-semibold text-gray-400 uppercase tracking-wider'>
                                    Access Permissions
                                  </p>
                                  <div className='flex items-center gap-2 ml-auto'>
                                    <span className='inline-flex items-center gap-1 text-[10px] font-medium'>
                                      <span className='w-2 h-2 rounded-full bg-green-500' />{' '}
                                      Granted
                                    </span>
                                    <span className='inline-flex items-center gap-1 text-[10px] font-medium'>
                                      <span className='w-2 h-2 rounded-full bg-red-400' />{' '}
                                      Not Granted
                                    </span>
                                  </div>
                                </div>
                                <div className='grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto [&::-webkit-scrollbar]:hidden'>
                                  {allPages.map(({ page, access }) => {
                                    const grantedInPage = access.filter((a) =>
                                      grantedIds.has(a.value),
                                    ).length;
                                    return (
                                      <div
                                        key={page}
                                        className='bg-gray-50 border border-gray-100 rounded-xl p-3'>
                                        {/* Page header with mini count */}
                                        <div className='flex items-center justify-between mb-2 border-b border-gray-100 pb-1.5'>
                                          <p className='text-xs font-bold text-gray-700 capitalize'>
                                            {page}
                                          </p>
                                          <span
                                            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                                              grantedInPage === access.length
                                                ? 'bg-green-100 text-green-600'
                                                : grantedInPage > 0
                                                  ? 'bg-yellow-100 text-yellow-600'
                                                  : 'bg-red-100 text-red-500'
                                            }`}>
                                            {grantedInPage}/{access.length}
                                          </span>
                                        </div>
                                        {/* Permission badges */}
                                        <div className='flex flex-wrap gap-1'>
                                          {access.map((a) => {
                                            const granted = grantedIds.has(
                                              a.value,
                                            );
                                            return (
                                              <span
                                                key={a.value}
                                                className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                                  granted
                                                    ? 'bg-green-100 text-green-700 border border-green-200'
                                                    : 'bg-red-50 text-red-500 border border-red-200'
                                                }`}>
                                                <span
                                                  className={`w-1.5 h-1.5 rounded-full ${granted ? 'bg-green-500' : 'bg-red-400'}`}
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
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className='flex flex-col items-center justify-center h-52 rounded-2xl border-2 border-dashed border-gray-200 text-center bg-gray-50'>
                      <ShieldCheck className='w-8 h-8 text-gray-300 mb-2' />
                      <p className='text-sm text-gray-400 font-medium'>
                        Hover a role to preview its access
                      </p>
                      <p className='text-xs text-gray-300 mt-1'>
                        Permissions will appear here
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 — Teams & WakaTime */}
          {activeStep === 2 && (
            <div className='animate-in fade-in slide-in-from-right-4 duration-300 grid gap-6 lg:grid-cols-2'>
              <SectionCard title='Teams' icon={Users}>
                <IdMultiSelect
                  label='Teams'
                  options={teamOptions}
                  value={waka.teamIds}
                  onChange={(teamIds) => setWaka((w) => ({ ...w, teamIds }))}
                  placeholder='Choose one or more teams'
                />
                <p className='mt-2 text-xs text-gray-500'>
                  A user can be in several teams. Teams are managed on the Teams screen; dashboards and reports filter by team.
                </p>
              </SectionCard>

              <SectionCard title='WakaTime tracking' icon={Activity}>
                <label className='flex items-center gap-2 text-sm text-gray-700'>
                  <input
                    type='checkbox'
                    className='h-4 w-4'
                    checked={waka.track}
                    onChange={(e) => setWaka((w) => ({ ...w, track: e.target.checked }))}
                  />
                  Track this user&apos;s coding activity (developer)
                </label>
                {waka.track ? (
                  <div className='mt-3 space-y-3'>
                    <div className='grid grid-cols-2 gap-3'>
                      <FieldGroup label='Employee Code'>
                        <Input
                          value={waka.developerCode}
                          onChange={(e) => setWaka((w) => ({ ...w, developerCode: e.target.value }))}
                          placeholder='Optional'
                          className='bg-gray-50 border border-gray-200 h-10 text-sm rounded-lg'
                        />
                      </FieldGroup>
                      <FieldGroup label='Designation'>
                        <Input
                          value={waka.designation}
                          onChange={(e) => setWaka((w) => ({ ...w, designation: e.target.value }))}
                          placeholder='e.g. Backend Developer'
                          className='bg-gray-50 border border-gray-200 h-10 text-sm rounded-lg'
                        />
                      </FieldGroup>
                    </div>
                    <TokenField
                      value={waka.apiKey}
                      onChange={(apiKey) => setWaka((w) => ({ ...w, apiKey }))}
                      label='WakaTime access token (optional — can be added later)'
                    />
                    {waka.apiKey.trim() && (
                      <PasswordInput
                        id='wizardTokenPassword'
                        label='Token protection password'
                        required
                        value={waka.confirmPassword}
                        onChange={(confirmPassword) => setWaka((w) => ({ ...w, confirmPassword }))}
                        help='Set in Settings › Security. The token change is mailed to the Super Admins and the new user.'
                      />
                    )}
                  </div>
                ) : (
                  <p className='mt-2 text-xs text-gray-500'>
                    Not tracked — e.g. managers or admins who only view dashboards.
                  </p>
                )}
              </SectionCard>
            </div>
          )}

          {/* STEP 3 — Review & Create */}
          {activeStep === 3 && !isDone && (
            <div className='animate-in fade-in slide-in-from-right-4 duration-300 space-y-4'>
              {/* ── Top notice banner ─────────────────────────────────────── */}
              <div className='flex items-center gap-2.5 px-4 py-2.5 bg-amber-50 border  rounded-xl'>
                <div className='w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0'>
                  <span className='text-white text-[10px] font-bold'>!</span>
                </div>
                <p className='text-xs text-amber-700 font-medium'>
                  Please review all details carefully before creating the user.
                </p>
              </div>

              {/* ── 3-column layout ───────────────────────────────────────── */}
              <div className='grid grid-cols-5 gap-4 items-start'>
                {/* LEFT — Avatar profile card (1/5) */}
                <div className='col-span-1 h-full'>
                  {(() => {
                    const initials =
                      `${formData.firstName?.[0] ?? ''}${formData.lastName?.[0] ?? ''}`.toUpperCase() ||
                      '?';
                    const colors = [
                      'bg-violet-500',
                      'bg-blue-500',
                      'bg-emerald-500',
                      'bg-amber-500',
                      'bg-rose-500',
                      'bg-cyan-500',
                    ];
                    const bg =
                      colors[
                        (formData.firstName?.charCodeAt(0) ?? 0) % colors.length
                      ];
                    return (
                      <div className='flex flex-col items-center text-center p-5 bg-white border border-gray-100 rounded-2xl shadow-sm h-full'>
                        {/* Avatar */}
                        <div
                          className={`w-16 h-16 rounded-full ${bg} flex items-center justify-center text-white text-xl font-bold mb-3 ring-4 ring-offset-2 ring-gray-100`}>
                          {initials}
                        </div>
                        <p className='text-sm font-bold text-gray-900 capitalize leading-tight'>
                          {formData.firstName} {formData.lastName}
                        </p>
                        <p className='text-xs text-gray-400 mt-0.5'>
                          @{formData.username}
                        </p>
                        <div className='mt-3 w-full border-t border-gray-100 pt-3 space-y-1.5'>
                          {/* <div className="flex items-center gap-1.5 justify-center">
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${gender === 'male' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>
                              {gender || '—'}
                            </span>
                          </div> */}
                          {/* Role badges */}
                          <div className='flex flex-wrap gap-1 justify-center mt-1'>
                            {selectedRoles.map((r: any) => (
                              <span
                                key={r.id}
                                className={`text-[10px] font-medium px-2 py-0.5 rounded-full border capitalize ${getRoleColor(r.role)}`}>
                                {r.role}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* CENTER — User info details (2/5) */}
                <div className='col-span-2'>
                  <div className='bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden'>
                    {/* Card header */}
                    <div
                      className='flex items-center gap-2 px-4 py-3'
                      style={{ backgroundColor: 'var(--action)' }}>
                      <ClipboardList className='w-4 h-4 text-white' />
                      <p className='text-sm font-semibold text-white'>
                        User Information
                      </p>
                    </div>
                    {/* Fields */}
                    <div className='divide-y divide-gray-50'>
                      {[
                        {
                          icon: User,
                          label: 'Full Name',
                          value: `${formData.firstName} ${formData.lastName}`,
                        },
                        {
                          icon: User,
                          label: 'Username',
                          value: formData.username,
                        },
                        { icon: Venus, label: 'Gender', value: gender },
                        { icon: Mail, label: 'Email', value: formData.email },
                        { icon: Phone, label: 'Phone', value: formData.phone },
                        {
                          icon: MapPin,
                          label: 'Location',
                          value: formData.location,
                        },
                        {
                          icon: Users,
                          label: 'Teams',
                          value: teamOptions.filter((t) => waka.teamIds.includes(t.id)).map((t) => t.label).join(', '),
                        },
                        {
                          icon: Activity,
                          label: 'WakaTime',
                          value: waka.track
                            ? `Tracked${waka.designation ? ` · ${waka.designation}` : ''}${waka.apiKey.trim() ? ' · token set' : ' · token later'}`
                            : 'Not tracked',
                        },
                      ].map(({ icon: Icon, label, value }) => (
                        <div
                          key={label}
                          className='flex items-center gap-3 px-4 py-2.5 group hover:bg-gray-50 transition-colors'>
                          <div className='w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0'>
                            <Icon className='w-3.5 h-3.5 text-gray-500' />
                          </div>
                          <span className='text-xs text-gray-400 w-20 flex-shrink-0'>
                            {label}
                          </span>
                          <span className='text-sm font-medium text-gray-800 capitalize flex-1 truncate'>
                            {value || '—'}
                          </span>
                          <button
                            type='button'
                            onClick={() => navigator.clipboard.writeText(value)}
                            className='opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer'
                            title='Copy'>
                            <Copy className='w-3.5 h-3.5 text-gray-400 hover:text-gray-600' />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* RIGHT — Assigned roles (2/5) */}
                <div className='col-span-2'>
                  <div className='bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden'>
                    {/* Card header */}
                    <div
                      className='flex items-center justify-between px-4 py-3'
                      style={{ backgroundColor: 'var(--action)' }}>
                      <div className='flex items-center gap-2'>
                        <ShieldCheck className='w-4 h-4 text-white' />
                        <p className='text-sm font-semibold text-white'>
                          Assigned Roles
                        </p>
                      </div>
                      <span className='text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full'>
                        {selectedRoles.length} role
                        {selectedRoles.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {selectedRoles.length > 0 ? (
                      <div className='divide-y divide-gray-50'>
                        {selectedRoles.map((r: any) => {
                          // Count granted scopes for this role
                          const roleGranted =
                            r.scopes?.filter((s: any) => s?.value)?.length ?? 0;
                          return (
                            <div
                              key={r.id}
                              className='flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors'>
                              {/* Role icon */}
                              <div
                                className='w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0'
                                style={{
                                  backgroundColor: 'var(--action-soft)',
                                }}>
                                <Shield
                                  className='w-4 h-4'
                                  style={{ color: 'var(--action)' }}
                                />
                              </div>
                              <div className='flex-1 min-w-0'>
                                <p className='text-sm font-semibold text-gray-800 capitalize'>
                                  {r.role}
                                </p>
                                {r.description && (
                                  <p className='text-[10px] text-gray-400 mt-0.5 truncate'>
                                    {r.description}
                                  </p>
                                )}
                              </div>
                              <div className='flex flex-col items-end gap-1'>
                                <span
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${getRoleColor(r.role)}`}>
                                  {r.role}
                                </span>
                                <span className='text-[9px] text-gray-400'>
                                  {roleGranted} permissions
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className='flex items-center justify-center py-8 text-gray-400'>
                        <p className='text-sm'>No roles assigned.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Success state ─────────────────────────────────────────────── */}
          {isDone && (
            <div className='flex flex-col items-center justify-center py-10 animate-in fade-in zoom-in-95 duration-500'>
              {/* Glow ring + avatar */}
              {(() => {
                const initials =
                  `${formData.firstName?.[0] ?? ''}${formData.lastName?.[0] ?? ''}`.toUpperCase() ||
                  '✓';
                const colors = [
                  'bg-violet-500',
                  'bg-blue-500',
                  'bg-emerald-500',
                  'bg-amber-500',
                  'bg-rose-500',
                  'bg-cyan-500',
                ];
                const bg =
                  colors[
                    (formData.firstName?.charCodeAt(0) ?? 0) % colors.length
                  ];
                return (
                  <div className='relative mb-5'>
                    <div className='absolute inset-0 rounded-full bg-emerald-300 blur-xl opacity-40 scale-110' />
                    <div
                      className={`relative w-20 h-20 rounded-full ${bg} flex items-center justify-center text-white text-2xl font-bold ring-4 ring-emerald-200 ring-offset-2`}>
                      {initials}
                    </div>
                    <div className='absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white'>
                      <CheckCircle2 className='w-4 h-4 text-white' />
                    </div>
                  </div>
                );
              })()}

              <h2 className='text-xl font-bold text-gray-900 mb-1'>
                User Created Successfully!
              </h2>
              <p className='text-sm text-gray-500 mt-1 mb-1'>
                <span className='font-semibold text-gray-800 capitalize'>
                  {formData.firstName} {formData.lastName}
                </span>{' '}
                has been onboarded.
              </p>
              {/* Role badges */}
              <div className='flex flex-wrap gap-1.5 justify-center mt-2 mb-6'>
                {selectedRoles.map((r: any) => (
                  <span
                    key={r.id}
                    className={`text-xs font-medium px-2.5 py-0.5 rounded-full border capitalize ${getRoleColor(r.role)}`}>
                    {r.role}
                  </span>
                ))}
              </div>

              {/* Quick details strip */}
              <div className='flex items-center gap-4 px-6 py-3 bg-gray-50 border border-gray-100 rounded-2xl mb-6 text-xs text-gray-500'>
                <span className='flex items-center gap-1.5'>
                  <Mail className='w-3.5 h-3.5 text-gray-400' />
                  {formData.email}
                </span>
                <span className='w-px h-4 bg-gray-200' />
                <span className='flex items-center gap-1.5'>
                  <MapPin className='w-3.5 h-3.5 text-gray-400' />
                  {formData.location || '—'}
                </span>
              </div>

              {/* Actions */}
              <div className='flex items-center gap-3'>
                <button
                  type='button'
                  onClick={handleReset}
                  className='flex items-center gap-2 px-5 py-2.5 text-white text-sm font-semibold rounded-lg transition cursor-pointer shadow-sm'
                  style={{ backgroundColor: 'var(--action)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.filter = 'brightness(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.filter = 'none';
                  }}>
                  <UserPlus className='w-4 h-4' /> Create Another
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer navigation ────────────────────────────────────────── */}
        {!isDone && (
          <div className='mt-4 flex items-center justify-between gap-4 border-t border-slate-200 px-1 pt-4'>
            {/* Who is creating · step */}
            <div className='flex min-w-0 items-center gap-3 text-xs text-slate-500'>
              <div className='ui-modal-footer-meta !mr-0'>
                <RecordedBy mode='create' name={createdBy} />
              </div>
              <span className='hidden h-6 w-px bg-slate-200 sm:block' />
              <p className='hidden whitespace-nowrap sm:block'>
                Step{' '}
                <span className='font-semibold text-slate-800'>
                  {activeStep + 1}
                </span>{' '}
                of {STEPS.length}
              </p>
            </div>

            <div className='flex shrink-0 items-center gap-2'>
              {activeStep > 0 && (
                <button
                  type='button'
                  onClick={() => setActiveStep((p) => p - 1)}
                  className='ui-btn ui-btn-secondary'>
                  <ArrowLeft />
                  Back
                </button>
              )}
              <button
                type='button'
                disabled={isSubmitting}
                onClick={handleNext}
                className='ui-btn ui-btn-primary min-w-[140px]'>
                {isSubmitting ? (
                  <Loader2 className='animate-spin' />
                ) : activeStep === 3 ? (
                  <Check />
                ) : null}
                {activeStep === 3 ? 'Create User' : 'Continue'}
                {!isSubmitting && activeStep < 3 && <ArrowRight />}
              </button>
            </div>
          </div>
        )}
      </form>
    </PageWrapper>
  );
};

export default UserCreationPage;
