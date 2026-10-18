'use client';

import { useEffect } from 'react';
import ErrorAnimation from '@/components/animation-ui/error';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('System Error Captured:', error);
  }, [error]);

  return (
    <div className='w-full h-full max-w-7xl mx-auto p-4 md:p-8'>
      <ErrorAnimation
        error={error}
        onRetry={() => reset()}
        isCenter={true}
        message='An unexpected technical glitch occurred. Please try again or return to the dashboard.'
      />
    </div>
  );
}
