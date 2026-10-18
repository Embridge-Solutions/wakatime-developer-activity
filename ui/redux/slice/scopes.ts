'use client';

import { apiSlice } from '.';

export const scopeSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getScopes: builder.query({
      query: () => ({
        url: '/scope/getScopes',
      }),
    }),
  }),
  overrideExisting: true,
});

export const { useGetScopesQuery } = scopeSlice;
