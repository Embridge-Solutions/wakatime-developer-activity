'use client';

import { useMemo } from 'react';
import { useAppSelector } from '@/redux/hooks';
import { useGetActivityScopeQuery, ActivityFilters } from '@/redux/slice/activity';

/**
 * The shared dashboard filters (Redux) + who the user is on the dashboards.
 * Non-admins are always pinned to their own developer — the API enforces it too.
 */
export function useActivityFilters() {
  const f = useAppSelector((s) => s.filters.activity);
  const { data: scopeData, isLoading: scopeLoading, isError: scopeError } = useGetActivityScopeQuery();
  const scope = scopeData?.data;

  const filters: ActivityFilters = useMemo(() => {
    const developerId = scope && !scope.isAdmin ? scope.developer?.developerId ?? null : f.developerId;
    return {
      fromDate: f.fromDate,
      toDate: f.toDate,
      developerId,
      teamId: scope?.isAdmin ? f.teamId : null,
    };
  }, [f, scope]);

  return {
    filters,
    raw: f,
    scope,
    isAdmin: Boolean(scope?.isAdmin),
    /** Without activity_viewall and not tracked in WakaTime: an explanation instead of data. */
    notLinked: Boolean(scope && !scope.isAdmin && !scope.linked),
    /** Wait for the scope before firing data queries. */
    ready: Boolean(scope) && !scopeLoading,
    scopeError,
  };
}
