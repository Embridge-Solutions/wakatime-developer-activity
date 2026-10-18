'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  getUserScopes,
  hasPageAccess,
  hasActionAccess,
  getPageActions,
  PageAccess,
} from '@/utils/auth-store';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScopeChecks {
  /** All page-access entries from localStorage */
  scopes: PageAccess[];
  /** Whether the current user has ANY access to the given page */
  canAccess: (page: string) => boolean;
  /** Whether the current user has a specific action on the given page */
  canDo: (page: string, action: string) => boolean;
  /** Whether the current user can READ the page */
  canRead: (page: string) => boolean;
  /**
   * Whether the current user can CREATE on the page.
   * @param page   - The scope page key (e.g. 'user', 'PurchaseOrder')
   * @param action - Optional override action (defaults to 'create')
   */
  canCreate: (page: string, action?: string) => boolean;
  /**
   * Whether the current user can UPDATE on the page.
   * @param page   - The scope page key
   * @param action - Optional override action (defaults to 'update')
   */
  canUpdate: (page: string, action?: string) => boolean;
  /**
   * Whether the current user can DELETE on the page.
   * @param page   - The scope page key
   * @param action - Optional override action (defaults to 'delete')
   */
  canDelete: (page: string, action?: string) => boolean;
  /** All actions available for a specific page */
  getActions: (page: string) => string[];
  /** True once scopes have been loaded from storage (avoids flash of incorrect UI) */
  ready: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * `useScopes` — React hook for scope-based access control.
 *
 * Reads user permissions from localStorage (populated at login) and
 * exposes a clean API for guarding screens, buttons, and actions.
 *
 * @example
 * ```tsx
 * const { canCreate, canDelete, canRead } = useScopes();
 *
 * // Hide the "Add User" button unless the user has user_create
 * {canCreate('user') && <Button>Add User</Button>}
 *
 * // Disable delete rows if 'user_delete' is missing
 * {canDelete('user') && <DeleteButton />}
 * ```
 */
export function useScopes(): ScopeChecks {
  const [scopes, setScopes] = useState<PageAccess[]>([]);
  const [ready, setReady] = useState(false);

  // Load scopes once on mount (localStorage is client-side only)
  useEffect(() => {
    const stored = getUserScopes();
    setScopes(stored);
    setReady(true);
  }, []);

  const canAccess = useCallback(
    (page: string) => hasPageAccess(page),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scopes],
  );

  const canDo = useCallback(
    (page: string, action: string) => hasActionAccess(page, action),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scopes],
  );

  const canRead   = useCallback((page: string) => canDo(page, 'view'), [canDo]);
  const canCreate = useCallback((page: string, action?: string) => canDo(page, action ?? 'create'), [canDo]);
  const canUpdate = useCallback((page: string, action?: string) => canDo(page, action ?? 'update'), [canDo]);
  const canDelete = useCallback((page: string, action?: string) => canDo(page, action ?? 'delete'), [canDo]);

  const getActions = useCallback(
    (page: string) => getPageActions(page),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scopes],
  );

  return {
    scopes,
    canAccess,
    canDo,
    canRead,
    canCreate,
    canUpdate,
    canDelete,
    getActions,
    ready,
  };
}
