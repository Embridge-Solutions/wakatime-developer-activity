'use client';

import { createContext, useContext, useEffect } from 'react';

/**
 * Lets content tell its PageWrapper what it contains. A Table registers
 * itself so the page hides its own Print / PDF buttons — the table toolbar
 * already prints and downloads.
 */
export const PageWrapperContext = createContext<{ registerTable: () => () => void } | null>(null);

/** Called by Table: marks the surrounding page as a table screen while mounted. */
export function useRegisterTable() {
  const ctx = useContext(PageWrapperContext);
  useEffect(() => ctx?.registerTable(), [ctx]);
}
