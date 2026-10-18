
'use client';

import { apiSlice } from '.';

export const roleSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getRoles: builder.query({
      query: () => ({
        url: '/role/getRoles',
      }),
      providesTags: ['Role'],
    }),

    addRole: builder.mutation({
      query: (data) => ({
        url: '/role/addRole',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Role'],
    }),

    updateRole: builder.mutation({
      query: ({ id, data }: { id: number, data: any }) => ({
        url: `/role/updateRole/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Role'],
    }),

    deleteRole: builder.mutation({
      query: (id: number) => ({
        url: `/role/deleteRole/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Role'],
    }),
  }),
  overrideExisting: true,
});


export const { useGetRolesQuery, useAddRoleMutation, useUpdateRoleMutation, useDeleteRoleMutation } = roleSlice;

