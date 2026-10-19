'use client';

import { apiSlice } from '.';

export interface WeeklyReportSettings {
  dayOfWeek: number; // 1 = Monday … 7 = Sunday
  time: string; // "HH:mm"
  sendToDevelopers: boolean;
  sendToTeamViewers: boolean;
  includeIdleDevelopers: boolean;
  extraTeamRecipients: string;
}
export interface WelcomeSettings {
  extraNote: string;
}
export interface MailSetting<T> {
  mailType: string;
  isEnabled: boolean;
  settings: T;
  updatedBy: string;
  updatedDate: string | null;
}
export interface MailSettings {
  weeklyReport: MailSetting<WeeklyReportSettings>;
  welcome: MailSetting<WelcomeSettings>;
}
/** A few non-secret fields of the mail server; credentials never reach the browser. */
export interface SmtpStatus {
  configured: boolean;
  server: string;
  security: string;
  user: string;
  sender: string;
}
export interface MailLog {
  id: number;
  mailType: string;
  periodKey: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  mailStatus: 'SENDING' | 'SENT' | 'FAILED' | 'SKIPPED';
  errorMessage: string;
  triggeredBy: string;
  createdDate: string;
  sentDate: string | null;
}
export type MailKind = 'weeklyDeveloper' | 'weeklyTeam' | 'welcome';

type Envelope<T> = { success: boolean; msg: string; data: T; detail?: string };

export const mailSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getMailSettings: builder.query<
      Envelope<MailSettings> & { schedule: { cron: string; text: string; lastWeek: { fromDate: string; toDate: string } } },
      void
    >({
      query: () => ({ url: '/mail/getSettings' }),
      providesTags: ['Mail'],
    }),
    updateMailSetting: builder.mutation<Envelope<unknown>, { mailType: string; isEnabled: boolean; settings: object }>({
      query: ({ mailType, ...body }) => ({ url: `/mail/updateSetting/${mailType}`, method: 'PUT', body }),
      invalidatesTags: ['Mail'],
    }),
    getSmtpStatus: builder.query<Envelope<SmtpStatus>, void>({
      query: () => ({ url: '/mail/getSmtpStatus' }),
      providesTags: ['Mail'],
    }),
    testSmtp: builder.mutation<Envelope<null>, void>({
      query: () => ({ url: '/mail/testSmtp', method: 'POST' }),
    }),
    previewMail: builder.mutation<Envelope<{ subject: string; html: string }>, { kind: MailKind; developerId?: number }>({
      query: (body) => ({ url: '/mail/preview', method: 'POST', body }),
    }),
    sendTestMail: builder.mutation<Envelope<{ to: string }>, { to: string; kind: MailKind }>({
      query: (body) => ({ url: '/mail/sendTest', method: 'POST', body }),
      invalidatesTags: ['Mail'],
    }),
    sendWeeklyNow: builder.mutation<
      Envelope<{ fromDate: string; toDate: string; sent: number; failed: number; alreadySent: number; skippedIdle: number }>,
      { force?: boolean; only?: 'developers' | 'team' }
    >({
      query: (body) => ({ url: '/mail/sendWeeklyNow', method: 'POST', body }),
      invalidatesTags: ['Mail'],
    }),
    getMailLogs: builder.query<Envelope<MailLog[]>, { top?: number; mailType?: string } | void>({
      query: (params) => ({ url: '/mail/getMailLogs', params: params || undefined }),
      providesTags: ['Mail'],
    }),
    sendWelcomeMail: builder.mutation<Envelope<null>, number>({
      query: (userId) => ({ url: `/mail/sendWelcome/${userId}`, method: 'POST' }),
      invalidatesTags: ['Mail'],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetMailSettingsQuery,
  useUpdateMailSettingMutation,
  useGetSmtpStatusQuery,
  useTestSmtpMutation,
  usePreviewMailMutation,
  useSendTestMailMutation,
  useSendWeeklyNowMutation,
  useGetMailLogsQuery,
  useSendWelcomeMailMutation,
} = mailSlice;
