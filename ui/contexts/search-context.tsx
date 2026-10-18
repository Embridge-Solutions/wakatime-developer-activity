'use client';

import { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';

interface PageContent {
  id: string;
  text: string;
}

interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isGlobalSearch: boolean;
  setIsGlobalSearch: (isGlobal: boolean) => void;
  pageContent: PageContent[];
  registerContent: (id: string, text: string) => void;
  unregisterContent: (id: string) => void;
  firstMatchId: string | null;
  setFirstMatchId: (id: string | null) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isGlobalSearch, setIsGlobalSearch] = useState(false);
  const [pageContent, setPageContent] = useState<PageContent[]>([]);
  const [firstMatchId, setFirstMatchId] = useState<string | null>(null);

  const registerContent = useCallback((id: string, text: string) => {
    setPageContent(prev => {
      const exists = prev.find(item => item.id === id);
      if (exists) {
        if (exists.text === text) return prev;
        return prev.map(item => item.id === id ? { id, text } : item);
      }
      return [...prev, { id, text }];
    });
  }, []);

  const unregisterContent = useCallback((id: string) => {
    setPageContent(prev => prev.filter(item => item.id !== id));
    setFirstMatchId(prev => (prev === id ? null : prev));
  }, []);

  const value = useMemo(() => ({
    searchQuery,
    setSearchQuery,
    isGlobalSearch,
    setIsGlobalSearch,
    pageContent,
    registerContent,
    unregisterContent,
    firstMatchId,
    setFirstMatchId,
  }), [
    searchQuery,
    isGlobalSearch,
    pageContent,
    registerContent,
    unregisterContent,
    firstMatchId
  ]);

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}
