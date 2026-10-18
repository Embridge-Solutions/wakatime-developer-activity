'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface PageTitleContextType {
  pageTitle: string;
  setPageTitle: (title: string) => void;
}

const PageTitleContext = createContext<PageTitleContextType | undefined>(
  undefined,
);

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [pageTitle, setPageTitle] = useState<string>('');

  return (
    <PageTitleContext.Provider value={{ pageTitle, setPageTitle }}>
      {children}
    </PageTitleContext.Provider>
  );
}

export function usePageTitle() {
  const context = useContext(PageTitleContext);
  if (context === undefined) {
    throw new Error('usePageTitle must be used within a PageTitleProvider');
  }
  return context;
}

/** Same as usePageTitle, but returns '' instead of throwing outside the provider. */
export function usePageTitleSafe(): string {
  return useContext(PageTitleContext)?.pageTitle ?? '';
}
