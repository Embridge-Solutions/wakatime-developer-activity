'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/side-bar';
import { TopBar } from '@/components/layout/top-bar';
import { PageTitleProvider } from '@/contexts/page-title-context';
import AppProviders from '@/components/app-provider';
import { SearchProvider } from '@/contexts/search-context';
import AuthChecker from '@/components/auth-checker';
import { APP_CONFIG } from '@/config/config';
import InactivityTimer from '@/components/auth/inactivity-timer';
import AppInitializer from '@/components/app-initializer';

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <AppProviders>
      <AppInitializer />
      <PageTitleProvider>
        <SearchProvider>
          <div className="h-screen w-screen overflow-hidden flex flex-col bg-theme-sidebar-bg p-1 transition-colors duration-300">
            {/* Main Workspace */}
            <div className="flex-1 flex min-h-0 w-full overflow-hidden gap-1.5 p-0.5">
              {/* Left Section - Sidebar */}
              <Sidebar
                isCollapsed={sidebarCollapsed}
                onToggle={toggleSidebar}
              />

              {/* Right Section - Navbar and Content */}
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden rounded-lg bg-theme-topbar-bg shadow-sm">
                {/* Top Bar */}
                <TopBar
                  sidebarCollapsed={sidebarCollapsed}
                  onToggleSidebar={toggleSidebar}
                />

                {/* Content Area */}
                <main className="flex-1 bg-app-canvas overflow-hidden min-h-0 min-w-0">
                  <div className="p-3 h-full overflow-y-auto overflow-x-hidden relative">
                    {/* ── Auth Guard: blocks page if user has no scope access ── */}
                    <AuthChecker>
                      <InactivityTimer />
                      {children}
                    </AuthChecker>
                  </div>
                </main>
              </div>
            </div>

            {/* Bottom Copyright Footer */}
            <div className="h-7 w-full bg-theme-sidebar-bg text-theme-sidebar-text text-center flex items-center justify-center border-t border-white/10 shrink-0 transition-colors duration-300">
              <p className="text-xs font-medium opacity-80">
                {APP_CONFIG?.POWERED_BY_TEXT}
              </p>
            </div>
          </div>
        </SearchProvider>
      </PageTitleProvider>
    </AppProviders>
  );
}
