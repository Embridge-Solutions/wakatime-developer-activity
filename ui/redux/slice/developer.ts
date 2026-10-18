'use client';

import { apiSlice } from '.';

/** Row from PRC_Get_Developer_List — the token itself never leaves the API. */
export interface Developer {
  developerId: number;
  developerCode: string;
  developerName: string;
  email: string;
  phone: string;
  designation: string;
  team: string;
  userId: number | null;
  hasApiKey: boolean;
  apiKeyHint: string;
  wakaUsername: string;
  wakaTimezone: string;
  keyStatus: 'NOT_SET' | 'VALID' | 'INVALID';
  keyVerifiedDate: string | null;
  lastSyncDate: string | null;
  lastSyncStatus: string;
  isActive: boolean;
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
}

export interface DeveloperInput {
  developerName: string;
  email: string;
  developerCode?: string;
  phone?: string;
  designation?: string;
  team?: string;
  userId?: number | null;
  isActive?: boolean;
  apiKey?: string;
}

export interface WakaAccount {
  wakaUserId: string | null;
  wakaUsername: string | null;
  displayName: string | null;
  email: string | null;
  timezone: string | null;
  timezoneWarning: string | null;
}

type Envelope<T> = { success: boolean; msg: string; data: T; warning?: string | null };

export const developerSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDevelopers: builder.query<Envelope<Developer[]>, { status?: string; search?: string } | void>({
      query: (params) => ({ url: '/developer/getDevelopers', params: params || undefined }),
      providesTags: ['Developer'],
    }),

    addDeveloper: builder.mutation<Envelope<Developer>, DeveloperInput>({
      query: (body) => ({ url: '/developer/addDeveloper', method: 'POST', body }),
      invalidatesTags: ['Developer', 'Activity'],
    }),

    updateDeveloper: builder.mutation<Envelope<Developer>, { id: number; data: DeveloperInput }>({
      query: ({ id, data }) => ({ url: `/developer/updateDeveloper/${id}`, method: 'PUT', body: data }),
      invalidatesTags: ['Developer', 'Activity'],
    }),

    updateDeveloperStatus: builder.mutation<Envelope<Developer>, { id: number; isActive: boolean }>({
      query: ({ id, isActive }) => ({ url: `/developer/updateStatus/${id}`, method: 'PUT', body: { isActive } }),
      invalidatesTags: ['Developer'],
    }),

    deleteDeveloper: builder.mutation<Envelope<null>, number>({
      query: (id) => ({ url: `/developer/deleteDeveloper/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Developer', 'Activity'],
    }),

    verifyApiKey: builder.mutation<Envelope<WakaAccount>, string>({
      query: (apiKey) => ({ url: '/developer/verifyApiKey', method: 'POST', body: { apiKey } }),
    }),

    updateApiKey: builder.mutation<Envelope<Developer>, { id: number; apiKey: string }>({
      query: ({ id, apiKey }) => ({ url: `/developer/updateApiKey/${id}`, method: 'PUT', body: { apiKey } }),
      invalidatesTags: ['Developer'],
    }),

    removeApiKey: builder.mutation<Envelope<Developer>, number>({
      query: (id) => ({ url: `/developer/removeApiKey/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Developer'],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetDevelopersQuery,
  useAddDeveloperMutation,
  useUpdateDeveloperMutation,
  useUpdateDeveloperStatusMutation,
  useDeleteDeveloperMutation,
  useVerifyApiKeyMutation,
  useUpdateApiKeyMutation,
  useRemoveApiKeyMutation,
} = developerSlice;
