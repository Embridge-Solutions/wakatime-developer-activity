import React from 'react';
import NotFoundAnimation from '@/components/animation-ui/not-found';

export default function GlobalNotFound() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Optional: Add global layout wrapper items here if needed */}
      <NotFoundAnimation />
    </div>
  );
}
