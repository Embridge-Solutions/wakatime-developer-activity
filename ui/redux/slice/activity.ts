'use client';

import { apiSlice } from '.';

/** Filters shared by every dashboard / report call. */
export interface ActivityFilters {
  fromDate: string;
  toDate: string;
  developerId?: number | null;
  teamId?: number | null;
}

export interface ActivityScope {
  /** activity_viewall — may see every developer */
  isAdmin: boolean;
  activeMinutes: number;
  linked: boolean;
  developer: { developerId: number; developerName: string; team: string } | null;
  today: string;
}

/** AI vs human line changes — present on most rows. */
export interface AiLines {
  aiAdditions: number;
  aiDeletions: number;
  humanAdditions: number;
  humanDeletions: number;
  aiLinePct: number | null;
}

export interface ActivitySummary extends AiLines {
  fromDate: string;
  toDate: string;
  rangeDays: number;
  registeredDevelopers: number;
  activeDevelopers: number;
  activeDeveloperDays: number;
  totalSeconds: number;
  totalHours: number;
  avgHoursPerActiveDay: number | null;
  heartbeatCount: number;
  aiCodingSeconds: number;
  aiCodingPct: number | null;
  aiInputTokens: number;
  aiOutputTokens: number;
  aiSessions: number;
  aiPromptEvents: number;
  aiCostUsd: number;
  projectCount: number;
  languageCount: number;
  editorCount: number;
  aiToolCount: number;
  aiModelCount: number;
  prevFromDate: string;
  prevToDate: string;
  prevTotalSeconds: number;
  prevActiveDevelopers: number;
  prevAiLinePct: number | null;
  prevAiCostUsd: number;
}

export interface DailyRow extends AiLines {
  activityDate: string;
  developerId: number;
  developerName: string;
  team: string;
  totalSeconds: number;
  codingHours: number;
  totalText: string;
  heartbeatCount: number;
  firstActivity: string | null;
  lastActivity: string | null;
  aiInputTokens: number;
  aiOutputTokens: number;
  aiSessions: number;
  aiPromptEvents: number;
  aiCostUsd: number;
  aiCodingSeconds: number;
  topProject: string;
}

export type Dimension =
  | 'project' | 'language' | 'editor' | 'category' | 'operating_system' | 'machine' | 'dependency' | 'branch' | 'entity';

export interface BreakdownRow extends AiLines {
  itemName: string;
  projectName: string;
  totalSeconds: number;
  hours: number;
  pct: number | null;
  developerCount: number;
  dayCount: number;
  aiCostUsd: number;
}

export interface DeveloperActivity extends AiLines {
  developerId: number;
  developerName: string;
  developerCode: string;
  team: string;
  designation: string;
  isActive: boolean;
  isDeleted: boolean;
  keyStatus: string;
  lastSyncStatus: string;
  lastSyncDate: string | null;
  totalSeconds: number;
  totalHours: number;
  activeDays: number;
  avgHoursPerActiveDay: number | null;
  dailyAverageHours: number;
  firstActiveDate: string | null;
  lastActiveDate: string | null;
  lastActivity: string | null;
  heartbeatCount: number;
  aiSessions: number;
  aiInputTokens: number;
  aiOutputTokens: number;
  aiCostUsd: number;
  aiCodingSeconds: number;
  topProject: string;
  topLanguage: string;
  topEditor: string;
}

export interface AiModelRow {
  modelName: string;
  lineChanges: number;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  costUsd: number;
  developerCount: number;
  dayCount: number;
}

export interface AgentRow extends AiLines {
  editor: string;
  totalSeconds: number;
  hours: number;
  developerCount: number;
  dayCount: number;
  aiInputTokens: number;
  aiOutputTokens: number;
  aiCostUsd: number;
  aiModels: string;
  isAiTool: boolean;
  lastSeen: string | null;
}

export interface HourlyRow {
  weekday: number; // 1 = Monday
  hourOfDay: number;
  totalSeconds: number;
  developerCount: number;
}

export interface TimelineRow {
  sliceValue: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  aiAdditions: number;
  aiDeletions: number;
  humanAdditions: number;
  humanDeletions: number;
  aiSessions: number;
  aiCostUsd: number;
}

export interface LiveRow {
  developerId: number;
  developerName: string;
  team: string;
  currentProject: string;
  lastActivity: string | null;
  minutesAgo: number | null;
  isWorkingNow: boolean;
  todaySeconds: number;
}

export interface ProjectRow {
  projectName: string;
  totalSeconds: number;
  hours: number;
  developerCount: number;
  dayCount: number;
  aiLines: number;
  humanLines: number;
  aiLinePct: number | null;
  aiCostUsd: number;
  lastActiveDate: string | null;
  branchCount: number;
  commitCount: number;
  repositoryUrl: string;
  repositoryProvider: string;
  lastActivity: string | null;
  workingNowCount: number;
}

export interface ProjectDeveloperRow {
  developerId: number;
  developerName: string;
  team: string;
  totalSeconds: number;
  hours: number;
  activeDays: number;
  aiLines: number;
  humanLines: number;
  aiLinePct: number | null;
  topBranch: string;
  commitCount: number;
  lastActivity: string | null;
  isWorkingNow: boolean;
}

export interface BranchRow {
  branch: string;
  totalSeconds: number;
  hours: number;
  developerCount: number;
  developers: string;
  firstActiveDate: string | null;
  lastActiveDate: string | null;
  branchStatus: 'ACTIVE' | 'IDLE' | 'STALE';
  commitCount: number;
  lastCommitMessage: string;
  lastCommitDate: string | null;
}

export interface CommitRow {
  commitHash: string;
  truncatedHash: string;
  branch: string;
  message: string;
  authorName: string;
  authorUsername: string;
  commitDate: string | null;
  totalSeconds: number;
  htmlUrl: string;
  developerName: string;
}

type Envelope<T> = { success: boolean; msg: string; data: T };

/** Drops empty filters so the API applies its own defaults. */
const clean = (params: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));

export const activitySlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getActivityScope: builder.query<Envelope<ActivityScope>, void>({
      query: () => ({ url: '/activity/getScope' }),
      providesTags: ['Activity'],
    }),
    getActivitySummary: builder.query<Envelope<ActivitySummary | null>, ActivityFilters>({
      query: (f) => ({ url: '/activity/getSummary', params: clean({ ...f }) }),
      providesTags: ['Activity'],
    }),
    getActivityDaily: builder.query<Envelope<DailyRow[]>, ActivityFilters>({
      query: (f) => ({ url: '/activity/getDaily', params: clean({ ...f }) }),
      providesTags: ['Activity'],
    }),
    getActivityBreakdown: builder.query<
      Envelope<BreakdownRow[]>,
      ActivityFilters & { dimension: Dimension; projectName?: string; top?: number }
    >({
      query: (f) => ({ url: '/activity/getBreakdown', params: clean({ ...f }) }),
      providesTags: ['Activity'],
    }),
    getActivityDevelopers: builder.query<Envelope<DeveloperActivity[]>, ActivityFilters>({
      query: (f) => ({ url: '/activity/getDevelopers', params: clean({ ...f }) }),
      providesTags: ['Activity'],
    }),
    getActivityAiModels: builder.query<Envelope<AiModelRow[]>, ActivityFilters>({
      query: (f) => ({ url: '/activity/getAiModels', params: clean({ ...f }) }),
      providesTags: ['Activity'],
    }),
    getActivityAgents: builder.query<Envelope<AgentRow[]>, ActivityFilters>({
      query: (f) => ({ url: '/activity/getAgents', params: clean({ ...f }) }),
      providesTags: ['Activity'],
    }),
    getActivityHourly: builder.query<Envelope<HourlyRow[]>, ActivityFilters>({
      query: (f) => ({ url: '/activity/getHourly', params: clean({ ...f }) }),
      providesTags: ['Activity'],
    }),
    getActivityLive: builder.query<Envelope<LiveRow[]>, { developerId?: number | null; teamId?: number | null }>({
      query: (p) => ({ url: '/activity/getLive', params: clean({ ...p }) }),
      providesTags: ['Activity'],
    }),
    getProjects: builder.query<Envelope<ProjectRow[]>, ActivityFilters>({
      query: (f) => ({ url: '/activity/getProjects', params: clean({ ...f }) }),
      providesTags: ['Activity'],
    }),
    getProjectDevelopers: builder.query<Envelope<ProjectDeveloperRow[]>, ActivityFilters & { projectName: string }>({
      query: (f) => ({ url: '/activity/getProjectDevelopers', params: clean({ ...f }) }),
      providesTags: ['Activity'],
    }),
    getProjectDaily: builder.query<Envelope<DailyRow[]>, ActivityFilters & { projectName: string }>({
      query: (f) => ({ url: '/activity/getProjectDaily', params: clean({ ...f }) }),
      providesTags: ['Activity'],
    }),
    getProjectBranches: builder.query<Envelope<BranchRow[]>, ActivityFilters & { projectName: string }>({
      query: (f) => ({ url: '/activity/getProjectBranches', params: clean({ ...f }) }),
      providesTags: ['Activity'],
    }),
    getProjectCommits: builder.query<Envelope<CommitRow[]>, ActivityFilters & { projectName: string; branch?: string; top?: number }>({
      query: (f) => ({ url: '/activity/getProjectCommits', params: clean({ ...f }) }),
      providesTags: ['Activity'],
    }),
    getActivityTimeline: builder.query<Envelope<TimelineRow[]>, { developerId: number; date: string; sliceBy?: string }>({
      query: (p) => ({ url: '/activity/getTimeline', params: clean({ ...p }) }),
      providesTags: ['Activity'],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetActivityScopeQuery,
  useGetActivitySummaryQuery,
  useGetActivityDailyQuery,
  useGetActivityBreakdownQuery,
  useGetActivityDevelopersQuery,
  useGetActivityAiModelsQuery,
  useGetActivityAgentsQuery,
  useGetActivityHourlyQuery,
  useGetActivityTimelineQuery,
  useGetActivityLiveQuery,
  useGetProjectsQuery,
  useGetProjectDevelopersQuery,
  useGetProjectDailyQuery,
  useGetProjectBranchesQuery,
  useGetProjectCommitsQuery,
} = activitySlice;
