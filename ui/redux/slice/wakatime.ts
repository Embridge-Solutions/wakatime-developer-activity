'use client';

import { apiSlice } from '.';

export interface SyncRun {
  runId: string;
  triggeredBy: string;
  developerId: number | null;
  developerName: string;
  activityDates: string;
  runStatus: 'RUNNING' | 'COMPLETED' | 'FAILED';
  developerCount: number | null;
  okCount: number | null;
  failedCount: number | null;
  errorMessage: string;
  startedDate: string;
  finishedDate: string | null;
  durationSeconds: number;
}

export interface SyncLog {
  id: number;
  runId: string;
  developerId: number;
  developerName: string;
  activityDate: string;
  syncStatus: 'SUCCESS' | 'FAILED' | 'AUTH_ERROR';
  triggeredBy: string;
  apiCalls: number | null;
  heartbeatCount: number | null;
  codingHours: number;
  errorMessage: string;
  startedDate: string;
  finishedDate: string | null;
}

export interface SyncState {
  running: boolean;
  runId: string | null;
  startedAt: string | null;
  triggeredBy: string | null;
  lastRun: { runId: string; ok: number; failed: number; developers: number; dates: string[]; finishedAt: string; error?: string } | null;
}

export interface SyncNowInput {
  developerId?: number | null;
  date?: string;
  days?: number;
}

type Envelope<T> = { success: boolean; msg: string; data: T };

export const wakatimeSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    syncNow: builder.mutation<Envelope<{ runId: string; dates: string[] }>, SyncNowInput>({
      query: (body) => ({ url: '/wakatime/syncNow', method: 'POST', body }),
      invalidatesTags: ['Sync'],
    }),

    getSyncStatus: builder.query<Envelope<SyncState>, void>({
      query: () => ({ url: '/wakatime/getSyncStatus' }),
      providesTags: ['Sync'],
    }),

    getSyncRuns: builder.query<Envelope<SyncRun[]>, { top?: number } | void>({
      query: (params) => ({ url: '/wakatime/getSyncRuns', params: params || undefined }),
      providesTags: ['Sync'],
    }),

    getSyncLogs: builder.query<Envelope<SyncLog[]>, { top?: number; runId?: string; developerId?: number; syncStatus?: string } | void>({
      query: (params) => ({ url: '/wakatime/getSyncLogs', params: params || undefined }),
      providesTags: ['Sync'],
    }),
  }),
  overrideExisting: true,
});

export const { useSyncNowMutation, useGetSyncStatusQuery, useGetSyncRunsQuery, useGetSyncLogsQuery } = wakatimeSlice;
