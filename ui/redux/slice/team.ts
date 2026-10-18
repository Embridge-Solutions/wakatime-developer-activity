'use client';

import { apiSlice } from '.';

export interface Team {
  teamId: number;
  teamName: string;
  description: string;
  isActive: boolean;
  memberCount: number;
  memberIds: number[];
  memberNames: string;
  createdBy: string;
  updatedDate: string;
}

export interface TeamInput {
  teamName: string;
  description?: string;
  isActive?: boolean;
  /** replaces the members when sent */
  memberIds?: number[];
}

type Envelope<T> = { success: boolean; msg: string; data: T };

export const teamSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getTeams: builder.query<Envelope<Team[]>, { activeOnly?: boolean } | void>({
      query: (params) => ({ url: '/team/getTeams', params: params || undefined }),
      providesTags: ['Team'],
    }),
    addTeam: builder.mutation<Envelope<Team>, TeamInput>({
      query: (body) => ({ url: '/team/addTeam', method: 'POST', body }),
      invalidatesTags: ['Team', 'User', 'Activity'],
    }),
    updateTeam: builder.mutation<Envelope<Team>, { id: number; data: TeamInput }>({
      query: ({ id, data }) => ({ url: `/team/updateTeam/${id}`, method: 'PUT', body: data }),
      invalidatesTags: ['Team', 'User', 'Activity'],
    }),
    deleteTeam: builder.mutation<Envelope<null>, number>({
      query: (id) => ({ url: `/team/deleteTeam/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Team', 'User', 'Activity'],
    }),
  }),
  overrideExisting: true,
});

export const { useGetTeamsQuery, useAddTeamMutation, useUpdateTeamMutation, useDeleteTeamMutation } = teamSlice;
