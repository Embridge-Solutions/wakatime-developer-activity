"use client";

import { apiSlice } from ".";

export const themeSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({


    getTheme: builder.query({
      query: () => ({
        url: "/common/theme/getTheme",
      }),
      providesTags: ["Theme"],
    }),

    updateTheme: builder.mutation({
      query: (body) => ({
        url: "/common/theme/updateTheme",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Theme"],
    }),

    /** Admin: upload a new logo (multipart field "logo"). */
    uploadThemeLogo: builder.mutation({
      query: (file: File) => {
        const body = new FormData();
        body.append("logo", file);
        return { url: "/common/theme/uploadLogo", method: "POST", body };
      },
      invalidatesTags: ["Theme"],
    }),
  }),
  overrideExisting: true,
});

export const {

  useGetThemeQuery,
  useUpdateThemeMutation,
  useUploadThemeLogoMutation,
} = themeSlice;

