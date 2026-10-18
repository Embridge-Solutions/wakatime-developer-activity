'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockIcon,
  User2Icon,
  X,
} from 'lucide-react';
import { showAlert } from '@/components/common/AlertHandler';
import { useVerifyUserMutation, useForgotPasswordMutation } from '@/redux/slice/auth';
import { cn } from '@/lib/utils';

interface ForgotPasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const MIN_PASSWORD_LENGTH = 6;

const inputGroupClass = (hasError: boolean) =>
  cn(
    'h-11 rounded-lg bg-white shadow-none',
    hasError ? 'border-status-down' : 'border-slate-300 hover:border-slate-400',
  );
const inputClass = 'h-full text-sm text-slate-900 placeholder:text-slate-400 autofill-light';

const FieldError = ({ id, message }: { id: string; message: string }) =>
  message ? (
    <p id={id} role="alert" className="flex items-center gap-1.5 text-xs font-medium text-status-down">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      {message}
    </p>
  ) : null;

/**
 * ForgotPasswordDialog
 * Two-step password recovery:
 *  Step 1 — verify username via POST /auth/verify-user
 *  Step 2 — reset password via POST /auth/forgot-password
 */
const ForgotPasswordDialog: React.FC<ForgotPasswordDialogProps> = ({
  isOpen,
  onClose,
}) => {
  // UI State
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form State
  const [identifier, setIdentifier] = useState('');
  const [verifiedName, setVerifiedName] = useState(''); // first name returned from API
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Validation State
  const [errors, setErrors] = useState({
    identifier: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Redux mutations
  const [verifyUser] = useVerifyUserMutation();
  const [forgotPassword] = useForgotPasswordMutation();

  // ── Step 1: Verify username ────────────────────────────────────────────
  const handleVerifyUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({ ...errors, identifier: '' });

    if (!identifier.trim()) {
      setErrors((prev) => ({ ...prev, identifier: 'Username is required.' }));
      return;
    }

    setIsLoading(true);
    try {
      const res = await verifyUser({ username: identifier.trim() });

      if ((res as any)?.error) {
        const msg =
          (res as any)?.error?.data?.msg ?? 'User not found. Please check your username.';
        setErrors((prev) => ({ ...prev, identifier: msg }));
        return;
      }

      // Store the verified first name for Step 2 display
      const firstName = (res as any)?.data?.data?.firstName ?? identifier;
      setVerifiedName(firstName);
      setStep(2);
    } catch {
      setErrors((prev) => ({ ...prev, identifier: 'Something went wrong. Please try again.' }));
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2: Reset password ─────────────────────────────────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    let hasError = false;
    const newResetErrors = { ...errors, newPassword: '', confirmPassword: '' };

    if (!newPassword) {
      newResetErrors.newPassword = 'New password is required.';
      hasError = true;
    } else if (newPassword.length < MIN_PASSWORD_LENGTH) {
      newResetErrors.newPassword = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
      hasError = true;
    }

    if (!confirmPassword) {
      newResetErrors.confirmPassword = 'Confirm password is required.';
      hasError = true;
    } else if (newPassword !== confirmPassword) {
      newResetErrors.confirmPassword = 'Passwords do not match.';
      hasError = true;
    }

    setErrors(newResetErrors);
    if (hasError) return;

    setIsLoading(true);
    try {
      const res = await forgotPassword({
        username: identifier.trim(),
        newPassword,
      });

      if ((res as any)?.error) {
        const msg =
          (res as any)?.error?.data?.msg ?? 'Failed to reset password. Please try again.';
        setErrors((prev) => ({ ...prev, newPassword: msg }));
        return;
      }

      showAlert({
        status: 'success',
        message: (res as any)?.data?.msg ?? 'Password reset successfully!',
      });
      handleClose();
    } catch {
      showAlert({ status: 'error', message: 'Something went wrong. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setIdentifier('');
    setVerifiedName('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setErrors({ identifier: '', newPassword: '', confirmPassword: '' });
    onClose();
  };

  const goBack = () => {
    setStep(1);
    setNewPassword('');
    setConfirmPassword('');
    setErrors({ ...errors, newPassword: '', confirmPassword: '' });
  };

  const passwordLongEnough = newPassword.length >= MIN_PASSWORD_LENGTH;
  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100%-2rem)] sm:max-w-[440px] gap-0 p-0 overflow-hidden bg-white border-slate-200 text-slate-900 shadow-2xl"
      >
        {/* Brand accent */}
        <div className="h-1 w-full bg-theme-primary" />

        <div className="p-6 sm:p-8">
          {/* Close */}
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="absolute right-4 top-5 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Header */}
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-950">
            {step === 1 ? (
              <KeyRound className="h-5 w-5 text-theme-primary" />
            ) : (
              <LockIcon className="h-5 w-5 text-theme-primary" />
            )}
          </div>

          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Step {step} of 2
          </p>
          <DialogTitle className="mt-1.5 font-display text-2xl font-bold tracking-tight text-slate-900">
            {step === 1 ? 'Reset your password' : 'Create a new password'}
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm text-slate-500 leading-relaxed">
            {step === 1
              ? 'Enter your username and we will verify your account before you choose a new password.'
              : `Choose a new password with at least ${MIN_PASSWORD_LENGTH} characters.`}
          </DialogDescription>

          {/* Progress */}
          <div className="mt-5 grid grid-cols-2 gap-2" aria-hidden="true">
            <span className="h-1 rounded-full bg-theme-primary" />
            <span className={cn('h-1 rounded-full', step === 2 ? 'bg-theme-primary' : 'bg-slate-200')} />
          </div>

          {step === 1 ? (
            /* --- STEP 1: Identification --- */
            <form
              onSubmit={handleVerifyUser}
              className="mt-6 space-y-6 animate-in fade-in slide-in-from-bottom-1 duration-200"
            >
              <div className="space-y-1.5">
                <label htmlFor="fp-username" className="block text-sm font-medium text-slate-700">
                  Username
                </label>
                <InputGroup className={inputGroupClass(!!errors.identifier)}>
                  <InputGroupAddon>
                    <User2Icon className="text-slate-400" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="fp-username"
                    type="text"
                    autoComplete="username"
                    autoFocus
                    placeholder="Enter your username"
                    value={identifier}
                    aria-invalid={!!errors.identifier}
                    aria-describedby="fp-username-error"
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      if (errors.identifier) setErrors({ ...errors, identifier: '' });
                    }}
                    className={inputClass}
                  />
                </InputGroup>
                <FieldError id="fp-username-error" message={errors.identifier} />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="h-11 flex-1 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group h-11 flex-1 rounded-lg bg-theme-primary text-sm font-semibold shadow-sm hover:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed transition-[filter] cursor-pointer flex items-center justify-center gap-2"
                  style={{ color: 'var(--theme-active-text)' }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* --- STEP 2: New password --- */
            <form
              onSubmit={handleResetPassword}
              className="mt-6 space-y-5 animate-in fade-in slide-in-from-right-1 duration-200"
            >
              {/* Verified account */}
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3">
                <BadgeCheck className="h-5 w-5 shrink-0 text-status-running" />
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Account verified</p>
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {verifiedName && verifiedName !== identifier
                      ? `${verifiedName} (${identifier})`
                      : identifier}
                  </p>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label htmlFor="fp-new-password" className="block text-sm font-medium text-slate-700">
                  New password
                </label>
                <InputGroup className={inputGroupClass(!!errors.newPassword)}>
                  <InputGroupAddon>
                    <LockIcon className="text-slate-400" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="fp-new-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    autoFocus
                    placeholder="Enter new password"
                    value={newPassword}
                    aria-invalid={!!errors.newPassword}
                    aria-describedby="fp-new-password-error"
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (errors.newPassword) setErrors({ ...errors, newPassword: '' });
                    }}
                    className={`${inputClass} [&::-ms-reveal]:hidden`}
                  />
                  <InputGroupAddon align="inline-end">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </InputGroupAddon>
                </InputGroup>
                {errors.newPassword ? (
                  <FieldError id="fp-new-password-error" message={errors.newPassword} />
                ) : (
                  <p
                    id="fp-new-password-error"
                    className={cn(
                      'text-xs',
                      passwordLongEnough ? 'text-status-running' : 'text-slate-500',
                    )}
                  >
                    {passwordLongEnough ? '✓ ' : ''}At least {MIN_PASSWORD_LENGTH} characters
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label htmlFor="fp-confirm-password" className="block text-sm font-medium text-slate-700">
                  Confirm new password
                </label>
                <InputGroup className={inputGroupClass(!!errors.confirmPassword)}>
                  <InputGroupAddon>
                    <LockIcon className="text-slate-400" />
                  </InputGroupAddon>
                  <InputGroupInput
                    id="fp-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    aria-invalid={!!errors.confirmPassword}
                    aria-describedby="fp-confirm-password-error"
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
                    }}
                    className={`${inputClass} [&::-ms-reveal]:hidden`}
                  />
                  <InputGroupAddon align="inline-end">
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </InputGroupAddon>
                </InputGroup>
                {errors.confirmPassword ? (
                  <FieldError id="fp-confirm-password-error" message={errors.confirmPassword} />
                ) : (
                  passwordsMatch && (
                    <p id="fp-confirm-password-error" className="text-xs text-status-running">
                      ✓ Passwords match
                    </p>
                  )
                )}
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1">
                <button
                  type="button"
                  onClick={goBack}
                  className="h-11 flex-1 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="h-11 flex-1 rounded-lg bg-theme-primary text-sm font-semibold shadow-sm hover:brightness-95 disabled:opacity-60 disabled:cursor-not-allowed transition-[filter] cursor-pointer flex items-center justify-center gap-2"
                  style={{ color: 'var(--theme-active-text)' }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update password'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ForgotPasswordDialog;
