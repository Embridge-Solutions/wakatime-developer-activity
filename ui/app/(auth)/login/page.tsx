'use client';

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockIcon,
  User2Icon,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useUserLoginMutation } from '@/redux/slice/auth';
import { APP_CONFIG } from '@/config/config';
import { BRAND, COPYRIGHT_TEXT } from '@/config/brand.config';
import { showAlert, dismissAllAlerts } from '@/components/common/AlertHandler';
import ForgotPasswordDialog from '@/components/auth/ForgotPasswordDialog';
import BrandLogo from '@/components/common/BrandLogo';
import { decodeToken, saveTokens } from '@/utils/auth';
import { StoredUser, landingPath } from '@/utils/auth-store';
import { applyUserTheme, ThemeConfig } from '@/utils/theme';
import { useGetThemeQuery } from '@/redux/slice/themeSlice';

type ApiResponse<User> = {
  data: User;
};

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

const inputGroupClass =
  'h-11 rounded-lg bg-white border-slate-300 shadow-none hover:border-slate-400';
const inputClass =
  'h-full text-sm text-slate-900 placeholder:text-slate-400 autofill-light';

/**
 * Built-in hero when BRAND.login.heroImage is empty: a week of "coding activity"
 * cells (7 rows × 24 hours) in the brand color, deterministic so it never flickers.
 */
const ActivityBackdrop = () => {
  const level = (d: number, h: number) => {
    const work = h >= 9 && h <= 19 ? 1 : h >= 21 || h <= 1 ? 0.35 : 0.08;
    const noise = ((d * 7 + h * 13) % 10) / 10;
    return Math.min(1, work * (0.35 + noise * 0.8));
  };
  return (
    <div className='absolute inset-0 flex items-center justify-center bg-[radial-gradient(ellipse_at_top_right,rgba(79,107,237,0.35),transparent_60%)]'>
      <div className='grid grid-cols-24 gap-1.5 opacity-70 rotate-[-8deg] scale-125' aria-hidden>
        {Array.from({ length: 7 * 24 }, (_, i) => {
          const d = Math.floor(i / 24);
          const h = i % 24;
          return (
            <span
              key={i}
              className='block h-5 w-5 rounded-[5px] bg-theme-primary'
              style={{ opacity: 0.08 + level(d, h) * 0.85 }}
            />
          );
        })}
      </div>
    </div>
  );
};

const LoginPage = () => {
  const router = useRouter();
  const [userLogin, { isLoading }] = useUserLoginMutation();
  const { data: themeData } = useGetThemeQuery(undefined);

  const [formData, setFormData] = useState({ username: '', password: '' });
  const [passwordView, setPasswordView] = useState<boolean>(false);
  const [isForgotPwdOpen, setIsForgotPwdOpen] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const isBusy = isLoading || isRedirecting;

  // Before sign-in there is no user yet → the admin's default theme
  useEffect(() => {
    applyUserTheme(themeData?.data as ThemeConfig | undefined);
  }, [themeData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    showAlert({
      status: 'loading',
      message: 'Logging in...',
    });

    try {
      const res = await userLogin(formData);

      dismissAllAlerts();

      if (!res.error) {
        // Store user details + scopes in localStorage
        const responseData = (res as ApiResponse<LoginResponse>)?.data;
        if (responseData) {
          const accessToken = responseData.accessToken;
          const refreshToken = responseData.refreshToken;

          if (accessToken) {
            saveTokens(accessToken, refreshToken);
          }

          //@ts-ignore
          const decodeData: StoredUser & { scopes?: any[] } =
            decodeToken() as any;

          const userData = {
            id: decodeData.id,
            username: decodeData.username,
            firstName: decodeData.firstName,
            lastName: decodeData.lastName,
            email: decodeData.email,
            phone: decodeData.phone,
            //@ts-ignore
            roles: decodeData.role,
            scopes: decodeData.scopes,
          };

          localStorage.setItem(
            APP_CONFIG.USER_DETAILS_KEY,
            btoa(JSON.stringify(userData)),
          );
        }
        setIsRedirecting(true);
        showAlert({
          status: 'success',
          message: 'Login successful! Redirecting...',
        });
        // Let the user see the success message briefly before redirecting
        setTimeout(() => {
          dismissAllAlerts();
          const urlParams = new URLSearchParams(window.location.search);
          // Admins land on the Team Dashboard, developers on their own dashboard
          const redirectTo = urlParams.get('redirect') || landingPath();
          router.replace(redirectTo);
          router.refresh();
        }, 2000);
        return;
      }

      return showAlert({
        status: 'error',
        message:
          // @ts-ignore
          res?.error?.data?.msg ||
          'Login failed. Please check your credentials.',
      });
    } catch (error: any) {
      dismissAllAlerts();
      console.log('error', error);
      return showAlert({
        status: 'error',
        message:
          // @ts-ignore
          error?.data?.msg || 'Login failed. Please check your credentials.',
      });
    }
  };

  return (
    <div className='min-h-screen w-full flex bg-white text-slate-900'>
      {/* ── LEFT: brand hero (desktop only) ─────────────────────────────── */}
      <aside className='relative hidden lg:flex lg:w-[55%] xl:w-[58%] flex-col justify-between overflow-hidden bg-slate-950 p-10 xl:p-14'>
        {BRAND.login.heroImage ? (
          <Image
            src={BRAND.login.heroImage}
            alt={BRAND.login.heroAlt}
            fill
            priority
            sizes='(min-width: 1024px) 58vw, 0px'
            className='object-cover object-center'
          />
        ) : (
          <ActivityBackdrop />
        )}
        {/* Darken for legible text: strong at the bottom-left, light at top-right */}
        <div className='absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/20' />
        <div className='absolute inset-0 bg-gradient-to-r from-slate-950/60 to-transparent' />

        <div className='relative z-10'>
          <BrandLogo className='h-11' />
        </div>

        <div className='relative z-10 max-w-xl'>
          <div className='flex items-center gap-2.5 mb-4'>
            <span className='forge-marker' />
            <p className='text-xs font-semibold uppercase tracking-[0.2em] text-theme-primary'>
              {BRAND.login.heroEyebrow}
            </p>
          </div>
          <h1 className='font-display text-4xl xl:text-5xl font-bold leading-[1.1] text-white'>
            {BRAND.login.heroTitle}
          </h1>
          <p className='mt-4 text-base text-slate-300 leading-relaxed'>
            {BRAND.product.tagline}
          </p>

          <ul className='mt-8 space-y-3'>
            {BRAND.login.highlights.map((item) => (
              <li
                key={item}
                className='flex items-center gap-3 text-sm text-slate-200'>
                <CheckCircle2 className='h-4.5 w-4.5 shrink-0 text-theme-primary' />
                {item}
              </li>
            ))}
          </ul>

          <p className='mt-12 text-xs text-slate-400'>{COPYRIGHT_TEXT}</p>
        </div>
      </aside>

      {/* ── RIGHT: sign-in form ─────────────────────────────────────────── */}
      <main className='flex-1 flex flex-col px-6 py-8 sm:px-12 bg-white'>
        <div className='flex-1 flex items-center justify-center'>
          <div className='w-full max-w-sm'>
            {/* Logo shown here only when the hero panel is hidden */}
            <BrandLogo className='h-10 mb-10 lg:hidden' />

            <p className='text-xs font-semibold uppercase tracking-[0.18em] text-slate-500'>
              {BRAND.product.name}
            </p>
            <h2 className='mt-2 font-display text-3xl font-bold tracking-tight text-slate-900'>
              {BRAND.login.formTitle}
            </h2>
            <span className='forge-underline mt-3' />
            <p className='mt-4 text-sm text-slate-500'>
              {BRAND.login.formSubtitle}
            </p>

            <form onSubmit={handleSubmit} className='mt-8 space-y-5'>
              <div className='space-y-1.5'>
                <label
                  htmlFor='username'
                  className='block text-sm font-medium text-slate-700'>
                  Username
                </label>
                <InputGroup className={inputGroupClass}>
                  <InputGroupAddon>
                    <User2Icon className='text-slate-400' />
                  </InputGroupAddon>
                  <InputGroupInput
                    id='username'
                    name='username'
                    type='text'
                    autoComplete='username'
                    autoFocus
                    required
                    value={formData.username}
                    onChange={handleChange}
                    placeholder='Enter your username'
                    className={inputClass}
                  />
                </InputGroup>
              </div>

              <div className='space-y-1.5'>
                <div className='flex items-center justify-between'>
                  <label
                    htmlFor='password'
                    className='block text-sm font-medium text-slate-700'>
                    Password
                  </label>
                  <button
                    type='button'
                    onClick={() => setIsForgotPwdOpen(true)}
                    className='text-xs font-medium text-slate-500 hover:text-slate-900 underline-offset-4 hover:underline cursor-pointer'>
                    Forgot password?
                  </button>
                </div>
                <InputGroup className={inputGroupClass}>
                  <InputGroupAddon>
                    <LockIcon className='text-slate-400' />
                  </InputGroupAddon>
                  <InputGroupInput
                    id='password'
                    name='password'
                    type={passwordView ? 'text' : 'password'}
                    autoComplete='current-password'
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder='Enter your password'
                    className={`${inputClass} [&::-ms-reveal]:hidden [&::-ms-clear]:hidden`}
                  />
                  <InputGroupAddon align='inline-end'>
                    <button
                      type='button'
                      onClick={() => setPasswordView(!passwordView)}
                      aria-label={
                        passwordView ? 'Hide password' : 'Show password'
                      }
                      className='p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer'>
                      {passwordView ? (
                        <EyeOff className='h-4 w-4' />
                      ) : (
                        <Eye className='h-4 w-4' />
                      )}
                    </button>
                  </InputGroupAddon>
                </InputGroup>
              </div>

              <button
                type='submit'
                disabled={isBusy}
                className='group mt-2 w-full h-11 rounded-lg bg-theme-primary text-sm font-semibold tracking-wide shadow-sm transition-[filter,transform] duration-150 hover:brightness-95 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'
                style={{ color: 'var(--theme-active-text)' }}>
                {isBusy ? (
                  <>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className='h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5' />
                  </>
                )}
              </button>
            </form>

            {BRAND.login.supportText && (
              <p className='mt-8 text-xs text-slate-500 leading-relaxed'>
                {BRAND.login.supportText}
              </p>
            )}
          </div>
        </div>

        <p className='text-center text-xs text-slate-400 lg:hidden'>
          {COPYRIGHT_TEXT}
        </p>
      </main>

      <ForgotPasswordDialog
        isOpen={isForgotPwdOpen}
        onClose={() => setIsForgotPwdOpen(false)}
      />
    </div>
  );
};

export default LoginPage;
