'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { hasUserSession, isRouteAccessible } from '@/utils/auth-store';
import { DatabaseZap, WifiOff, RefreshCcw } from 'lucide-react';
import { Button } from './ui/button';
import UnauthorizedAccess from './animation-ui/unauthorized-access';
import { useAppSelector } from '@/redux/hooks';

/**
 * ─── AUTH GUARD ────────────────────────────────────────────────────────
 *
 * Client-side route protection based on user scopes/permissions.
 *
 * Checks:
 * 1. Session in localStorage → NO → redirect to /login
 * 2. Route accessible by scope → NO → show <UnauthorizedAccess /> animation
 *    → YES → render children normally
 * 3. Server reachability → offline → show Database Offline screen
 *
 * Health-check strategy (cloud-optimised, zero-cost):
 * - Server status is detected AUTOMATICALLY from every RTK Query API call
 *   (dashboard, reports, auth, etc.) via the centralized baseQuery wrapper.
 * - FETCH_ERROR / TIMEOUT_ERROR → server offline
 * - Any HTTP response (even 4xx/5xx) → server online
 * - No dedicated /ping endpoint. No polling. No extra cloud API calls.
 * - Recovery is instant — the first successful API call flips back to online.
 * - Works with setupListeners (refetchOnFocus / refetchOnReconnect).
 */

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthChecker({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<'loading' | 'allowed' | 'denied'>('loading');

  // ── Server & DB status from Redux ──
  const isServerOnline = useAppSelector((state) => state.serverStatus.isOnline);
  const isDbOnline = useAppSelector((state) => state.serverStatus.isDbOnline);

  // ── Route / session check on every navigation ──────────────────────
  useEffect(() => {
    if (!hasUserSession()) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    setStatus(isRouteAccessible(pathname) ? 'allowed' : 'denied');
  }, [pathname, router]);

  // ── Loading spinner ────────────────────────────────────────────────
  if (String(status) === 'loading') {
    return (
      <div className='flex items-center justify-center h-full w-full'>
        <div className='flex flex-col items-center gap-3'>
          <div className='w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin' />
          <p className='text-sm text-gray-500 font-medium'>System Integrity Check...</p>
        </div>
      </div>
    );
  }

  // ── Access Denied → animated 403 screen ───────────────────────────
  if (status === 'denied') {
    return <UnauthorizedAccess />;
  }

  // ── Access Allowed → render page with non-intrusive warning banners ──
  return (
    <div className='flex flex-col h-full w-full relative'>
      {/* Non-intrusive Warning Banner */}
      {(!isServerOnline || !isDbOnline) && (
        <div className='mb-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top duration-300 shadow-md shrink-0'>
          <div className='flex items-center gap-3 min-w-0'>
            <div className='w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center animate-pulse shrink-0'>
              {!isServerOnline ? (
                <WifiOff className='w-5 h-5 text-amber-600' />
              ) : (
                <DatabaseZap className='w-5 h-5 text-rose-500' />
              )}
            </div>
            <div className='min-w-0'>
              <h4 className='font-bold text-slate-800 text-sm truncate'>
                {!isServerOnline ? 'Server Connection Interrupted' : 'Database Connection Offline'}
              </h4>
              <p className='text-xs text-slate-500 mt-0.5 leading-relaxed truncate md:whitespace-normal'>
                {!isServerOnline 
                  ? 'We are having trouble reaching the main server. Your current views are based on cached data.'
                  : 'The server is active, but the database connection was lost. Write operations are temporarily disabled.'}
              </p>
            </div>
          </div>
          <Button
            onClick={() => window.location.reload()}
            size='sm'
            className='bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 transition-all shrink-0 px-4 py-2 text-xs'
          >
            <RefreshCcw className='w-3.5 h-3.5' />
            Reconnect
          </Button>
        </div>
      )}
      
      <div className='flex-1 min-h-0 min-w-0'>
        {children}
      </div>
    </div>
  );
}

