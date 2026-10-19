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

    // My WakaTime — the logged-in user's own developer
    getMyDeveloper: builder.query<Envelope<Developer | null>, void>({
      query: () => ({ url: '/developer/getMyDeveloper' }),
      providesTags: ['Developer'],
    }),
    verifyMyApiKey: builder.mutation<Envelope<WakaAccount>, string>({
      query: (apiKey) => ({ url: '/developer/verifyMyApiKey', method: 'POST', body: { apiKey } }),
    }),
    updateMyApiKey: builder.mutation<Envelope<Developer>, { apiKey: string; loginPassword: string }>({
      query: (body) => ({ url: '/developer/updateMyApiKey', method: 'PUT', body }),
      invalidatesTags: ['Developer', 'Activity'],
    }),

    verifyApiKey: builder.mutation<Envelope<WakaAccount>, string>({
      query: (apiKey) => ({ url: '/developer/verifyApiKey', method: 'POST', body: { apiKey } }),
    }),

    /** confirmPassword = the token protection password (Settings › Security) */
    updateApiKey: builder.mutation<Envelope<Developer>, { id: number; apiKey: string; confirmPassword: string }>({
      query: ({ id, ...body }) => ({ url: `/developer/updateApiKey/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Developer'],
    }),

    removeApiKey: builder.mutation<Envelope<Developer>, { id: number; confirmPassword: string }>({
      query: ({ id, confirmPassword }) => ({ url: `/developer/removeApiKey/${id}`, method: 'DELETE', body: { confirmPassword } }),
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
  useGetMyDeveloperQuery,
  useVerifyMyApiKeyMutation,
  useUpdateMyApiKeyMutation,
} = developerSlice;
