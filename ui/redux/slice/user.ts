'use client';

import { apiSlice } from '.';

export const userSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query({
      query: () => ({ url: '/user/getUsers' }),
      providesTags: ['User'],
    }),

    addUser: builder.mutation({
      query: (data) => ({ url: '/user/addUser', method: 'POST', body: data }),
      invalidatesTags: ['User'],
    }),

    updateUser: builder.mutation({
      query: ({ id, data }: { id: number; data: any }) => ({
        url: `/user/updateUser/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),

    updateProfile: builder.mutation({
      query: ({ id, data }: { id: number; data: any }) => ({
        url: `/user/updateProfile/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),

    deleteUser: builder.mutation({
      query: (id: number) => ({ url: `/user/deleteUser/${id}`, method: 'DELETE' }),
      invalidatesTags: ['User'],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetUsersQuery,
  useAddUserMutation,
  useUpdateUserMutation,
  useUpdateProfileMutation,
  useDeleteUserMutation,
} = userSlice;
