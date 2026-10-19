'use client';

import { apiSlice } from '.';

export interface SecurityStatus {
  tokenPassword: { isSet: boolean; updatedBy: string; updatedDate: string | null };
  /** developers may update their own token on My WakaTime */
  developerSelfToken: boolean;
}

type Envelope<T> = { success: boolean; msg: string; data: T };

export const securitySlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSecurity: builder.query<Envelope<SecurityStatus>, void>({
      query: () => ({ url: '/security/getSecurity' }),
      providesTags: ['Security'],
    }),
    setTokenPassword: builder.mutation<
      Envelope<null>,
      { currentPassword?: string; loginPassword?: string; newPassword: string; confirmPassword: string }
    >({
      query: (body) => ({ url: '/security/setTokenPassword', method: 'PUT', body }),
      invalidatesTags: ['Security'],
    }),
    setDeveloperSelfToken: builder.mutation<Envelope<SecurityStatus>, boolean>({
      query: (enabled) => ({ url: '/security/setDeveloperSelfToken', method: 'PUT', body: { enabled } }),
      invalidatesTags: ['Security'],
    }),
  }),
  overrideExisting: true,
});

export const { useGetSecurityQuery, useSetTokenPasswordMutation, useSetDeveloperSelfTokenMutation } = securitySlice;
