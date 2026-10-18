'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { landingPath } from '@/utils/auth-store';

/** "/" and "/home" land here: the first screen this user's scopes allow (admin → Team Dashboard, developer → My Dashboard). */
export default function StartPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace(landingPath());
  }, [router]);
  return null;
}
