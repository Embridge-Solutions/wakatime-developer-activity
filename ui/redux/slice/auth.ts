'use client';

import { apiSlice } from '.';

export const authSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    userLogin: builder.mutation({
      query: (data) => ({
        url: '/auth/login',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Auth'],
    }),

    userLogout: builder.mutation<void,void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['Auth'],  
    }),
    
    updatePassword: builder.mutation({
      query: (data) => ({
        url: '/auth/update-password',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Auth'],
    }),

    // ── Forgot Password: Step 1 — verify username exists ──────────────
    verifyUser: builder.mutation({
      query: (data) => ({
        url: '/auth/verify-user',
        method: 'POST',
        body: data,
      }),
    }),

    // ── Forgot Password: Step 2 — reset password (no current pw needed) ─
    forgotPassword: builder.mutation({
      query: (data) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body: data,
      }),
    }),

  }),
  overrideExisting: true,
});

export const {
  useUserLoginMutation,
  useUserLogoutMutation,
  useUpdatePasswordMutation,
  useVerifyUserMutation,
  useForgotPasswordMutation,
} = authSlice;

