'use client';

import { useSearch } from '@/contexts/search-context';
import { useId, useEffect, useRef } from 'react';

interface SearchHighlightProps {
  text: string;
  className?: string;
  highlightClassName?: string;
}

export function SearchHighlight({ 
  text, 
  className = '', 
  highlightClassName = 'bg-yellow-300/60 text-black rounded px-0.5 transition-all duration-300'
}: SearchHighlightProps) {
  const { 
    searchQuery, 
    registerContent, 
    unregisterContent, 
    firstMatchId, 
    setFirstMatchId 
  } = useSearch();
  const id = useId();
  const markRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (text) registerContent(id, text);
    return () => unregisterContent(id);
  }, [id, text, registerContent, unregisterContent]);
  
  const query = searchQuery.trim();
  const isMatch = text && query && text.toLowerCase().includes(query.toLowerCase());

  // Auto-scroll logic: scroll only if this is the first match in the registry
  useEffect(() => {
    if (isMatch && firstMatchId === id && markRef.current) {
      markRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isMatch, firstMatchId, id]);

  // Reset first match on search change is handled in TopBar or Context usually,
  // But we can help here:
  useEffect(() => {
    if (isMatch && !firstMatchId) {
      setFirstMatchId(id);
    }
  }, [isMatch, firstMatchId, id, setFirstMatchId]);

  if (!query || !text) {
    return <span className={className}>{text || ''}</span>;
  }

  // Escape special characters for regex
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));

  return (
    <span className={className}>
      {parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} ref={i === 0 ? markRef : null} className={highlightClassName}>
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
}
