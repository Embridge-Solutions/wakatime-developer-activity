/* =============================================================================
   DEVELOPER ACTIVITY — dashboard & report procedures
   (called by the API, services/activity-services/controller/activity.js)

   Common filters on every procedure:
     @pIN_fromDate, @pIN_toDate   IST activity days, inclusive
     @pIN_developerId             one developer (NULL = everyone)
     @pIN_teamId                  one team (E2M_Team_M.id) — developers whose login is in the team (NULL = everyone)
     @pIN_timeZone                Windows time zone name for times shown on screen

     PRC_Get_Activity_Summary      KPIs for the range + the same KPIs for the previous range
     PRC_Get_Activity_Daily        one row per developer per day (trend charts, daily report)
     PRC_Get_Activity_Breakdown    time + AI lines per project / language / editor / category /
                                   operating_system / machine / dependency / branch / entity
     PRC_Get_Activity_Developers   one row per developer (leaderboard, team report)
     PRC_Get_Activity_AI_Models    AI model usage: lines, tokens, cost
     PRC_Get_Activity_Agents       editors / AI tools ("agents") used, with AI vs human lines
     PRC_Get_Activity_Hourly       coding time by weekday × hour (heatmap)
     PRC_Get_Activity_Timeline     one developer-day: work blocks with start / end time

   Projects & live status
     PRC_Get_Activity_Live         who is working now (last activity within @pIN_activeMinutes) and on what
     PRC_Get_Activity_Projects     every project: time, developers, AI, branches, commits, working now
     PRC_Get_Project_Developers    one project: each developer's time, AI, top branch, commits, working now
     PRC_Get_Project_Daily         one project: hours per developer per day
     PRC_Get_Project_Branches      one project: branches with time, developers, commits and status
     PRC_Get_Project_Commits       one project: commit messages (repository linked in WakaTime)

   "AI %" everywhere = AI line changes / (AI + human line changes), additions + deletions,
   as reported by WakaTime's GenAI tracking.

   Run after 01 and 03. Re-runnable. Needs SQL Server 2016+.
============================================================================= */

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO


/* ─── KPIs ─────────────────────────────────────────────────────────────────── */

CREATE OR ALTER PROCEDURE dbo.PRC_Get_Activity_Summary
	@pIN_fromDate    date,
	@pIN_toDate      date,
	@pIN_developerId int           = NULL,
	@pIN_teamId      int           = NULL
AS
BEGIN
	SET NOCOUNT ON;

	DECLARE @days     int  = DATEDIFF(day, @pIN_fromDate, @pIN_toDate) + 1;
	DECLARE @prevFrom date = DATEADD(day, -@days, @pIN_fromDate);
	DECLARE @prevTo   date = DATEADD(day, -1, @pIN_fromDate);

	SELECT D.id, D.isActive, D.isDeleted INTO #dev
	FROM dbo.E2M_Developer_M D
	WHERE (@pIN_developerId IS NULL OR D.id = @pIN_developerId)
	  AND (@pIN_teamId IS NULL OR D.userId IN (SELECT TU.userId FROM dbo.E2M_Team_User_T TU WHERE TU.teamId = @pIN_teamId));

	SELECT S.* INTO #cur
	FROM dbo.E2M_Waka_Daily_Summary_T S
	JOIN #dev ON #dev.id = S.developerId
	WHERE S.activityDate BETWEEN @pIN_fromDate AND @pIN_toDate;

	SELECT S.developerId, S.totalSeconds, S.aiAdditions, S.aiDeletions, S.humanAdditions, S.humanDeletions, S.aiCostUsd INTO #prev
	FROM dbo.E2M_Waka_Daily_Summary_T S
	JOIN #dev ON #dev.id = S.developerId
	WHERE S.activityDate BETWEEN @prevFrom AND @prevTo;

	SELECT B.dimension, B.itemName, B.totalSeconds, B.aiAdditions, B.aiDeletions INTO #bd
	FROM dbo.E2M_Waka_Daily_Breakdown_T B
	JOIN #dev ON #dev.id = B.developerId
	WHERE B.activityDate BETWEEN @pIN_fromDate AND @pIN_toDate
	  AND B.dimension IN ('project', 'language', 'editor', 'category');

	DECLARE @ai    float = (SELECT ISNULL(SUM(ISNULL(aiAdditions, 0) + ISNULL(aiDeletions, 0)), 0) FROM #cur);
	DECLARE @human float = (SELECT ISNULL(SUM(ISNULL(humanAdditions, 0) + ISNULL(humanDeletions, 0)), 0) FROM #cur);
	DECLARE @prevAi    float = (SELECT ISNULL(SUM(ISNULL(aiAdditions, 0) + ISNULL(aiDeletions, 0)), 0) FROM #prev);
	DECLARE @prevHuman float = (SELECT ISNULL(SUM(ISNULL(humanAdditions, 0) + ISNULL(humanDeletions, 0)), 0) FROM #prev);
	DECLARE @total     float = (SELECT ISNULL(SUM(totalSeconds), 0) FROM #cur);
	DECLARE @aiCoding  float = (SELECT ISNULL(SUM(totalSeconds), 0) FROM #bd WHERE dimension = 'category' AND LOWER(itemName) = 'ai coding');

	SELECT CONVERT(varchar(10), @pIN_fromDate, 23)                                      AS fromDate,
	       CONVERT(varchar(10), @pIN_toDate, 23)                                        AS toDate,
	       @days                                                                        AS rangeDays,
	       (SELECT COUNT(1) FROM #dev WHERE isDeleted = 0 AND isActive = 1)             AS registeredDevelopers,
	       (SELECT COUNT(DISTINCT developerId) FROM #cur WHERE totalSeconds > 0)        AS activeDevelopers,
	       (SELECT COUNT(1) FROM #cur WHERE totalSeconds > 0)                           AS activeDeveloperDays,
	       @total                                                                       AS totalSeconds,
	       ROUND(@total / 3600.0, 2)                                                    AS totalHours,
	       ROUND(@total / 3600.0 / NULLIF((SELECT COUNT(1) FROM #cur WHERE totalSeconds > 0), 0), 2) AS avgHoursPerActiveDay,
	       (SELECT ISNULL(SUM(CAST(heartbeatCount AS bigint)), 0) FROM #cur)            AS heartbeatCount,
	       (SELECT ISNULL(SUM(aiAdditions), 0)    FROM #cur)                            AS aiAdditions,
	       (SELECT ISNULL(SUM(aiDeletions), 0)    FROM #cur)                            AS aiDeletions,
	       (SELECT ISNULL(SUM(humanAdditions), 0) FROM #cur)                            AS humanAdditions,
	       (SELECT ISNULL(SUM(humanDeletions), 0) FROM #cur)                            AS humanDeletions,
	       CAST(ROUND(100.0 * @ai / NULLIF(@ai + @human, 0), 1) AS float)               AS aiLinePct,
	       @aiCoding                                                                    AS aiCodingSeconds,
	       CAST(ROUND(100.0 * @aiCoding / NULLIF(@total, 0), 1) AS float)               AS aiCodingPct,
	       (SELECT ISNULL(SUM(aiInputTokens), 0)  FROM #cur)                            AS aiInputTokens,
	       (SELECT ISNULL(SUM(aiOutputTokens), 0) FROM #cur)                            AS aiOutputTokens,
	       (SELECT ISNULL(SUM(aiSessions), 0)     FROM #cur)                            AS aiSessions,
	       (SELECT ISNULL(SUM(aiPromptEvents), 0) FROM #cur)                            AS aiPromptEvents,
	       (SELECT ROUND(ISNULL(SUM(aiCostUsd), 0), 2) FROM #cur)                       AS aiCostUsd,
	       (SELECT COUNT(DISTINCT itemName) FROM #bd WHERE dimension = 'project')       AS projectCount,
	       (SELECT COUNT(DISTINCT itemName) FROM #bd WHERE dimension = 'language')      AS languageCount,
	       (SELECT COUNT(DISTINCT itemName) FROM #bd WHERE dimension = 'editor')        AS editorCount,
	       (SELECT COUNT(DISTINCT itemName) FROM #bd
	         WHERE dimension = 'editor' AND ISNULL(aiAdditions, 0) + ISNULL(aiDeletions, 0) > 0) AS aiToolCount,
	       (SELECT COUNT(DISTINCT M.modelName)
	          FROM dbo.E2M_Waka_AI_Model_Daily_T M JOIN #dev ON #dev.id = M.developerId
	         WHERE M.activityDate BETWEEN @pIN_fromDate AND @pIN_toDate)               AS aiModelCount,

	       -- previous range of the same length, for "vs previous period"
	       CONVERT(varchar(10), @prevFrom, 23)                                          AS prevFromDate,
	       CONVERT(varchar(10), @prevTo, 23)                                            AS prevToDate,
	       (SELECT ISNULL(SUM(totalSeconds), 0) FROM #prev)                             AS prevTotalSeconds,
	       (SELECT COUNT(DISTINCT developerId) FROM #prev WHERE totalSeconds > 0)       AS prevActiveDevelopers,
	       CAST(ROUND(100.0 * @prevAi / NULLIF(@prevAi + @prevHuman, 0), 1) AS float)   AS prevAiLinePct,
	       (SELECT ROUND(ISNULL(SUM(aiCostUsd), 0), 2) FROM #prev)                      AS prevAiCostUsd;
END
GO


/* ─── Daily — one row per developer per day ───────────────────────────────── */

CREATE OR ALTER PROCEDURE dbo.PRC_Get_Activity_Daily
	@pIN_fromDate    date,
	@pIN_toDate      date,
	@pIN_developerId int           = NULL,
	@pIN_teamId      int           = NULL,
	@pIN_timeZone    varchar(60)   = 'India Standard Time'
AS
BEGIN
	SET NOCOUNT ON;

	DECLARE @tz   varchar(60)   = ISNULL(NULLIF(@pIN_timeZone, ''), 'India Standard Time');

	SELECT CONVERT(varchar(10), S.activityDate, 23)                    AS activityDate,
	       S.developerId,
	       D.developerName,
	       dbo.FN_Get_User_Teams(D.userId)                             AS team,
	       S.totalSeconds,
	       ROUND(S.totalSeconds / 3600.0, 2)                           AS codingHours,
	       ISNULL(S.totalText, '')                                     AS totalText,
	       S.heartbeatCount,
	       CONVERT(varchar(19), CAST(S.firstActivityUtc AT TIME ZONE 'UTC' AT TIME ZONE @tz AS datetime2(0)), 126) AS firstActivity,
	       CONVERT(varchar(19), CAST(S.lastActivityUtc  AT TIME ZONE 'UTC' AT TIME ZONE @tz AS datetime2(0)), 126) AS lastActivity,
	       ISNULL(S.aiAdditions, 0)                                    AS aiAdditions,
	       ISNULL(S.aiDeletions, 0)                                    AS aiDeletions,
	       ISNULL(S.humanAdditions, 0)                                 AS humanAdditions,
	       ISNULL(S.humanDeletions, 0)                                 AS humanDeletions,
	       CAST(ROUND(100.0 * (ISNULL(S.aiAdditions, 0) + ISNULL(S.aiDeletions, 0))
	            / NULLIF(ISNULL(S.aiAdditions, 0) + ISNULL(S.aiDeletions, 0)
	                     + ISNULL(S.humanAdditions, 0) + ISNULL(S.humanDeletions, 0), 0), 1) AS float) AS aiLinePct,
	       ISNULL(S.aiInputTokens, 0)                                  AS aiInputTokens,
	       ISNULL(S.aiOutputTokens, 0)                                 AS aiOutputTokens,
	       ISNULL(S.aiSessions, 0)                                     AS aiSessions,
	       ISNULL(S.aiPromptEvents, 0)                                 AS aiPromptEvents,
	       ROUND(ISNULL(S.aiCostUsd, 0), 4)                            AS aiCostUsd,
	       ISNULL(C.aiCodingSeconds, 0)                                AS aiCodingSeconds,
	       ISNULL(P.topProject, '')                                    AS topProject
	FROM dbo.E2M_Waka_Daily_Summary_T S
	JOIN dbo.E2M_Developer_M D ON D.id = S.developerId
	OUTER APPLY (SELECT SUM(B.totalSeconds) AS aiCodingSeconds
	             FROM dbo.E2M_Waka_Daily_Breakdown_T B
	             WHERE B.developerId = S.developerId AND B.activityDate = S.activityDate
	               AND B.dimension = 'category' AND LOWER(B.itemName) = 'ai coding') C
	OUTER APPLY (SELECT TOP (1) B.itemName AS topProject
	             FROM dbo.E2M_Waka_Daily_Breakdown_T B
	             WHERE B.developerId = S.developerId AND B.activityDate = S.activityDate AND B.dimension = 'project'
	             ORDER BY B.totalSeconds DESC) P
	WHERE S.activityDate BETWEEN @pIN_fromDate AND @pIN_toDate
	  AND (@pIN_developerId IS NULL OR S.developerId = @pIN_developerId)
	  AND (@pIN_teamId IS NULL OR D.userId IN (SELECT TU.userId FROM dbo.E2M_Team_User_T TU WHERE TU.teamId = @pIN_teamId))
	ORDER BY S.activityDate, D.developerName;
END
GO


/* ─── Breakdown — time per project / language / editor / … ───────────────── */

/*
   EXEC PRC_Get_Activity_Breakdown '2026-10-01', '2026-10-18', @pIN_dimension = 'language'
   EXEC PRC_Get_Activity_Breakdown '2026-10-01', '2026-10-18', @pIN_dimension = 'branch', @pIN_projectName = N'E2M'
*/
CREATE OR ALTER PROCEDURE dbo.PRC_Get_Activity_Breakdown
	@pIN_fromDate    date,
	@pIN_toDate      date,
	@pIN_dimension   varchar(30),
	@pIN_developerId int           = NULL,
	@pIN_teamId      int           = NULL,
	@pIN_projectName nvarchar(400) = NULL,   -- branch / entity of one project
	@pIN_top         int           = 50
AS
BEGIN
	SET NOCOUNT ON;

	DECLARE @project nvarchar(400) = NULLIF(@pIN_projectName, '');

	SELECT B.* INTO #rows
	FROM dbo.E2M_Waka_Daily_Breakdown_T B
	JOIN dbo.E2M_Developer_M D ON D.id = B.developerId
	WHERE B.dimension = @pIN_dimension
	  AND B.activityDate BETWEEN @pIN_fromDate AND @pIN_toDate
	  AND (@pIN_developerId IS NULL OR B.developerId = @pIN_developerId)
	  AND (@pIN_teamId IS NULL OR D.userId IN (SELECT TU.userId FROM dbo.E2M_Team_User_T TU WHERE TU.teamId = @pIN_teamId))
	  AND (@project IS NULL OR B.projectName = @project);

	DECLARE @total float = (SELECT SUM(totalSeconds) FROM #rows);

	SELECT TOP (ISNULL(@pIN_top, 50))
	       R.itemName,
	       R.projectName,
	       SUM(R.totalSeconds)                                              AS totalSeconds,
	       ROUND(SUM(R.totalSeconds) / 3600.0, 2)                           AS hours,
	       CAST(ROUND(100.0 * SUM(R.totalSeconds) / NULLIF(@total, 0), 1) AS float) AS pct,
	       COUNT(DISTINCT R.developerId)                                    AS developerCount,
	       COUNT(DISTINCT R.activityDate)                                   AS dayCount,
	       ISNULL(SUM(R.aiAdditions), 0)                                    AS aiAdditions,
	       ISNULL(SUM(R.aiDeletions), 0)                                    AS aiDeletions,
	       ISNULL(SUM(R.humanAdditions), 0)                                 AS humanAdditions,
	       ISNULL(SUM(R.humanDeletions), 0)                                 AS humanDeletions,
	       CAST(ROUND(100.0 * ISNULL(SUM(ISNULL(R.aiAdditions, 0) + ISNULL(R.aiDeletions, 0)), 0)
	            / NULLIF(SUM(ISNULL(R.aiAdditions, 0) + ISNULL(R.aiDeletions, 0)
	                         + ISNULL(R.humanAdditions, 0) + ISNULL(R.humanDeletions, 0)), 0), 1) AS float) AS aiLinePct,
	       ROUND(ISNULL(SUM(R.aiCostUsd), 0), 2)                            AS aiCostUsd
	FROM #rows R
	GROUP BY R.itemName, R.projectName
	ORDER BY SUM(R.totalSeconds) DESC;
END
GO


/* ─── Developers — one row per developer ──────────────────────────────────── */

CREATE OR ALTER PROCEDURE dbo.PRC_Get_Activity_Developers
	@pIN_fromDate    date,
	@pIN_toDate      date,
	@pIN_developerId int           = NULL,
	@pIN_teamId      int           = NULL,
	@pIN_timeZone    varchar(60)   = 'India Standard Time'
AS
BEGIN
	SET NOCOUNT ON;

	DECLARE @days int           = DATEDIFF(day, @pIN_fromDate, @pIN_toDate) + 1;
	DECLARE @tz   varchar(60)   = ISNULL(NULLIF(@pIN_timeZone, ''), 'India Standard Time');

	SELECT D.id                                                          AS developerId,
	       D.developerName,
	       ISNULL(D.developerCode, '')                                   AS developerCode,
	       dbo.FN_Get_User_Teams(D.userId)                               AS team,
	       ISNULL(D.designation, '')                                     AS designation,
	       D.isActive,
	       D.isDeleted,
	       D.keyStatus,
	       ISNULL(D.lastSyncStatus, '')                                  AS lastSyncStatus,
	       CONVERT(varchar(19), D.lastSyncDate, 126)                     AS lastSyncDate,
	       ISNULL(A.totalSeconds, 0)                                     AS totalSeconds,
	       ROUND(ISNULL(A.totalSeconds, 0) / 3600.0, 2)                  AS totalHours,
	       ISNULL(A.activeDays, 0)                                       AS activeDays,
	       ROUND(ISNULL(A.totalSeconds, 0) / 3600.0 / NULLIF(A.activeDays, 0), 2) AS avgHoursPerActiveDay,
	       ROUND(ISNULL(A.totalSeconds, 0) / 3600.0 / @days, 2)          AS dailyAverageHours,
	       CONVERT(varchar(10), A.firstDay, 23)                          AS firstActiveDate,
	       CONVERT(varchar(10), A.lastDay, 23)                           AS lastActiveDate,
	       CONVERT(varchar(19), CAST(A.lastActivityUtc AT TIME ZONE 'UTC' AT TIME ZONE @tz AS datetime2(0)), 126) AS lastActivity,
	       ISNULL(A.heartbeatCount, 0)                                   AS heartbeatCount,
	       ISNULL(A.aiAdditions, 0)                                      AS aiAdditions,
	       ISNULL(A.aiDeletions, 0)                                      AS aiDeletions,
	       ISNULL(A.humanAdditions, 0)                                   AS humanAdditions,
	       ISNULL(A.humanDeletions, 0)                                   AS humanDeletions,
	       CAST(ROUND(100.0 * (ISNULL(A.aiAdditions, 0) + ISNULL(A.aiDeletions, 0))
	            / NULLIF(ISNULL(A.aiAdditions, 0) + ISNULL(A.aiDeletions, 0)
	                     + ISNULL(A.humanAdditions, 0) + ISNULL(A.humanDeletions, 0), 0), 1) AS float) AS aiLinePct,
	       ISNULL(A.aiSessions, 0)                                       AS aiSessions,
	       ISNULL(A.aiInputTokens, 0)                                    AS aiInputTokens,
	       ISNULL(A.aiOutputTokens, 0)                                   AS aiOutputTokens,
	       ROUND(ISNULL(A.aiCostUsd, 0), 2)                              AS aiCostUsd,
	       ISNULL(C.aiCodingSeconds, 0)                                  AS aiCodingSeconds,
	       ISNULL(TP.itemName, '')                                       AS topProject,
	       ISNULL(TL.itemName, '')                                       AS topLanguage,
	       ISNULL(TE.itemName, '')                                       AS topEditor
	FROM dbo.E2M_Developer_M D
	OUTER APPLY (SELECT SUM(S.totalSeconds)                        AS totalSeconds,
	                    SUM(CASE WHEN S.totalSeconds > 0 THEN 1 ELSE 0 END) AS activeDays,
	                    MIN(CASE WHEN S.totalSeconds > 0 THEN S.activityDate END) AS firstDay,
	                    MAX(CASE WHEN S.totalSeconds > 0 THEN S.activityDate END) AS lastDay,
	                    MAX(S.lastActivityUtc)                     AS lastActivityUtc,
	                    SUM(CAST(S.heartbeatCount AS bigint))      AS heartbeatCount,
	                    SUM(S.aiAdditions)    AS aiAdditions,    SUM(S.aiDeletions)    AS aiDeletions,
	                    SUM(S.humanAdditions) AS humanAdditions, SUM(S.humanDeletions) AS humanDeletions,
	                    SUM(S.aiSessions)     AS aiSessions,
	                    SUM(S.aiInputTokens)  AS aiInputTokens,  SUM(S.aiOutputTokens) AS aiOutputTokens,
	                    SUM(S.aiCostUsd)      AS aiCostUsd
	             FROM dbo.E2M_Waka_Daily_Summary_T S
	             WHERE S.developerId = D.id AND S.activityDate BETWEEN @pIN_fromDate AND @pIN_toDate) A
	OUTER APPLY (SELECT SUM(B.totalSeconds) AS aiCodingSeconds
	             FROM dbo.E2M_Waka_Daily_Breakdown_T B
	             WHERE B.developerId = D.id AND B.activityDate BETWEEN @pIN_fromDate AND @pIN_toDate
	               AND B.dimension = 'category' AND LOWER(B.itemName) = 'ai coding') C
	OUTER APPLY (SELECT TOP (1) B.itemName FROM dbo.E2M_Waka_Daily_Breakdown_T B
	             WHERE B.developerId = D.id AND B.activityDate BETWEEN @pIN_fromDate AND @pIN_toDate AND B.dimension = 'project'
	             GROUP BY B.itemName ORDER BY SUM(B.totalSeconds) DESC) TP
	OUTER APPLY (SELECT TOP (1) B.itemName FROM dbo.E2M_Waka_Daily_Breakdown_T B
	             WHERE B.developerId = D.id AND B.activityDate BETWEEN @pIN_fromDate AND @pIN_toDate AND B.dimension = 'language'
	             GROUP BY B.itemName ORDER BY SUM(B.totalSeconds) DESC) TL
	OUTER APPLY (SELECT TOP (1) B.itemName FROM dbo.E2M_Waka_Daily_Breakdown_T B
	             WHERE B.developerId = D.id AND B.activityDate BETWEEN @pIN_fromDate AND @pIN_toDate AND B.dimension = 'editor'
	             GROUP BY B.itemName ORDER BY SUM(B.totalSeconds) DESC) TE
	WHERE (@pIN_developerId IS NULL OR D.id = @pIN_developerId)
	  AND (@pIN_teamId IS NULL OR D.userId IN (SELECT TU.userId FROM dbo.E2M_Team_User_T TU WHERE TU.teamId = @pIN_teamId))
	  AND (D.isDeleted = 0 OR ISNULL(A.totalSeconds, 0) > 0)   -- deleted developers only when they have activity
	ORDER BY ISNULL(A.totalSeconds, 0) DESC, D.developerName;
END
GO


/* ─── AI models ────────────────────────────────────────────────────────────── */

CREATE OR ALTER PROCEDURE dbo.PRC_Get_Activity_AI_Models
	@pIN_fromDate    date,
	@pIN_toDate      date,
	@pIN_developerId int           = NULL,
	@pIN_teamId      int           = NULL
AS
BEGIN
	SET NOCOUNT ON;


	SELECT M.modelName,
	       ISNULL(SUM(M.lineChanges), 0)        AS lineChanges,
	       ISNULL(SUM(M.inputTokens), 0)        AS inputTokens,
	       ISNULL(SUM(M.outputTokens), 0)       AS outputTokens,
	       ISNULL(SUM(M.cachedInputTokens), 0)  AS cachedInputTokens,
	       ROUND(ISNULL(SUM(M.costUsd), 0), 2)  AS costUsd,
	       COUNT(DISTINCT M.developerId)        AS developerCount,
	       COUNT(DISTINCT M.activityDate)       AS dayCount
	FROM dbo.E2M_Waka_AI_Model_Daily_T M
	JOIN dbo.E2M_Developer_M D ON D.id = M.developerId
	WHERE M.activityDate BETWEEN @pIN_fromDate AND @pIN_toDate
	  AND (@pIN_developerId IS NULL OR M.developerId = @pIN_developerId)
	  AND (@pIN_teamId IS NULL OR D.userId IN (SELECT TU.userId FROM dbo.E2M_Team_User_T TU WHERE TU.teamId = @pIN_teamId))
	GROUP BY M.modelName
	ORDER BY SUM(M.lineChanges) DESC, SUM(M.costUsd) DESC;
END
GO


/* ─── Agents — editors / AI tools ──────────────────────────────────────────── */

/*
   One row per editor / AI tool seen in the range (from the daily editor
   breakdown), with the AI models WakaTime detected for that tool and whether
   it wrote AI lines — isAiTool = 1 means AI lines or an AI model were seen.
*/
CREATE OR ALTER PROCEDURE dbo.PRC_Get_Activity_Agents
	@pIN_fromDate    date,
	@pIN_toDate      date,
	@pIN_developerId int           = NULL,
	@pIN_teamId      int           = NULL,
	@pIN_timeZone    varchar(60)   = 'India Standard Time'
AS
BEGIN
	SET NOCOUNT ON;

	DECLARE @tz   varchar(60)   = ISNULL(NULLIF(@pIN_timeZone, ''), 'India Standard Time');

	SELECT D.id INTO #dev
	FROM dbo.E2M_Developer_M D
	WHERE (@pIN_developerId IS NULL OR D.id = @pIN_developerId)
	  AND (@pIN_teamId IS NULL OR D.userId IN (SELECT TU.userId FROM dbo.E2M_Team_User_T TU WHERE TU.teamId = @pIN_teamId));

	SELECT B.itemName                                     AS editor,
	       SUM(B.totalSeconds)                            AS totalSeconds,
	       COUNT(DISTINCT B.developerId)                  AS developerCount,
	       COUNT(DISTINCT B.activityDate)                 AS dayCount,
	       ISNULL(SUM(B.aiAdditions), 0)                  AS aiAdditions,
	       ISNULL(SUM(B.aiDeletions), 0)                  AS aiDeletions,
	       ISNULL(SUM(B.humanAdditions), 0)               AS humanAdditions,
	       ISNULL(SUM(B.humanDeletions), 0)               AS humanDeletions,
	       ISNULL(SUM(B.aiInputTokens), 0)                AS aiInputTokens,
	       ISNULL(SUM(B.aiOutputTokens), 0)               AS aiOutputTokens,
	       ROUND(ISNULL(SUM(B.aiCostUsd), 0), 2)          AS aiCostUsd
	INTO #editors
	FROM dbo.E2M_Waka_Daily_Breakdown_T B
	JOIN #dev ON #dev.id = B.developerId
	WHERE B.dimension = 'editor' AND B.activityDate BETWEEN @pIN_fromDate AND @pIN_toDate
	GROUP BY B.itemName;

	SELECT DISTINCT U.editor, U.aiModel INTO #models
	FROM dbo.E2M_Waka_User_Agent_T U
	JOIN #dev ON #dev.id = U.developerId
	WHERE NULLIF(U.aiModel, '') IS NOT NULL;

	SELECT E.editor,
	       E.totalSeconds,
	       ROUND(E.totalSeconds / 3600.0, 2)              AS hours,
	       E.developerCount,
	       E.dayCount,
	       E.aiAdditions, E.aiDeletions, E.humanAdditions, E.humanDeletions,
	       CAST(ROUND(100.0 * (E.aiAdditions + E.aiDeletions)
	            / NULLIF(E.aiAdditions + E.aiDeletions + E.humanAdditions + E.humanDeletions, 0), 1) AS float) AS aiLinePct,
	       E.aiInputTokens, E.aiOutputTokens, E.aiCostUsd,
	       ISNULL(STUFF((SELECT N', ' + M.aiModel FROM #models M WHERE M.editor = E.editor ORDER BY M.aiModel
	                     FOR XML PATH(''), TYPE).value('.', 'nvarchar(max)'), 1, 2, N''), N'') AS aiModels,
	       CAST(CASE WHEN E.aiAdditions + E.aiDeletions > 0
	                   OR EXISTS (SELECT 1 FROM #models M WHERE M.editor = E.editor) THEN 1 ELSE 0 END AS bit) AS isAiTool,
	       (SELECT CONVERT(varchar(19), CAST(MAX(U.lastSeenUtc) AT TIME ZONE 'UTC' AT TIME ZONE @tz AS datetime2(0)), 126)
	          FROM dbo.E2M_Waka_User_Agent_T U JOIN #dev ON #dev.id = U.developerId
	         WHERE U.editor = E.editor)                   AS lastSeen
	FROM #editors E
	ORDER BY E.totalSeconds DESC;
END
GO


/* ─── Hourly heatmap ───────────────────────────────────────────────────────── */

/*
   weekday 1 = Monday … 7 = Sunday (independent of SET DATEFIRST).
   Each work block counts in the hour it started.
*/
CREATE OR ALTER PROCEDURE dbo.PRC_Get_Activity_Hourly
	@pIN_fromDate    date,
	@pIN_toDate      date,
	@pIN_developerId int           = NULL,
	@pIN_teamId      int           = NULL,
	@pIN_timeZone    varchar(60)   = 'India Standard Time'
AS
BEGIN
	SET NOCOUNT ON;

	DECLARE @tz   varchar(60)   = ISNULL(NULLIF(@pIN_timeZone, ''), 'India Standard Time');

	SELECT (DATEDIFF(day, '19000101', L.startLocal) % 7) + 1 AS weekday,
	       DATEPART(hour, L.startLocal)                     AS hourOfDay,
	       SUM(U.durationSeconds)                           AS totalSeconds,
	       COUNT(DISTINCT U.developerId)                    AS developerCount
	FROM dbo.E2M_Waka_Durations_T U
	JOIN dbo.E2M_Developer_M D ON D.id = U.developerId
	CROSS APPLY (SELECT CAST(U.startUtc AT TIME ZONE 'UTC' AT TIME ZONE @tz AS datetime2(0)) AS startLocal) L
	WHERE U.sliceBy = 'project'
	  AND U.activityDate BETWEEN @pIN_fromDate AND @pIN_toDate
	  AND (@pIN_developerId IS NULL OR U.developerId = @pIN_developerId)
	  AND (@pIN_teamId IS NULL OR D.userId IN (SELECT TU.userId FROM dbo.E2M_Team_User_T TU WHERE TU.teamId = @pIN_teamId))
	GROUP BY (DATEDIFF(day, '19000101', L.startLocal) % 7) + 1, DATEPART(hour, L.startLocal)
	ORDER BY weekday, hourOfDay;
END
GO


/* ─── Timeline — one developer-day ─────────────────────────────────────────── */

CREATE OR ALTER PROCEDURE dbo.PRC_Get_Activity_Timeline
	@pIN_developerId int,
	@pIN_activityDate date,
	@pIN_sliceBy     varchar(30) = 'project',
	@pIN_timeZone    varchar(60) = 'India Standard Time'
AS
BEGIN
	SET NOCOUNT ON;

	DECLARE @tz varchar(60) = ISNULL(NULLIF(@pIN_timeZone, ''), 'India Standard Time');

	SELECT ISNULL(U.sliceValue, '')                                AS sliceValue,
	       CONVERT(varchar(19), L.startLocal, 126)                 AS startTime,
	       CONVERT(varchar(19), DATEADD(second, CAST(U.durationSeconds AS int), L.startLocal), 126) AS endTime,
	       U.durationSeconds,
	       ISNULL(U.aiAdditions, 0)    AS aiAdditions,
	       ISNULL(U.aiDeletions, 0)    AS aiDeletions,
	       ISNULL(U.humanAdditions, 0) AS humanAdditions,
	       ISNULL(U.humanDeletions, 0) AS humanDeletions,
	       ISNULL(U.aiSessions, 0)     AS aiSessions,
	       ROUND(ISNULL(U.aiCostUsd, 0), 4) AS aiCostUsd
	FROM dbo.E2M_Waka_Durations_T U
	CROSS APPLY (SELECT CAST(U.startUtc AT TIME ZONE 'UTC' AT TIME ZONE @tz AS datetime2(0)) AS startLocal) L
	WHERE U.developerId = @pIN_developerId
	  AND U.activityDate = @pIN_activityDate
	  AND U.sliceBy = ISNULL(NULLIF(@pIN_sliceBy, ''), 'project')
	ORDER BY U.startUtc;
END
GO


/* ═══ Projects & live status ═════════════════════════════════════════════════ */

/*
   "Working now" = WakaTime saw activity within the last @pIN_activeMinutes
   (E2M_Waka_Project_T.lastHeartbeatUtc, refreshed by the live job every few minutes).
   One row per active developer, most recent first.
*/
CREATE OR ALTER PROCEDURE dbo.PRC_Get_Activity_Live
	@pIN_developerId   int         = NULL,
	@pIN_teamId        int         = NULL,
	@pIN_activeMinutes int         = 15,
	@pIN_today         date        = NULL,
	@pIN_timeZone      varchar(60) = 'India Standard Time'
AS
BEGIN
	SET NOCOUNT ON;

	DECLARE @tz  varchar(60) = ISNULL(NULLIF(@pIN_timeZone, ''), 'India Standard Time');
	DECLARE @now datetime2(0) = SYSUTCDATETIME();
	DECLARE @today date = ISNULL(@pIN_today, CAST(SYSDATETIMEOFFSET() AT TIME ZONE @tz AS date));

	SELECT D.id                                                       AS developerId,
	       D.developerName,
	       dbo.FN_Get_User_Teams(D.userId)                            AS team,
	       ISNULL(P.projectName, '')                                  AS currentProject,
	       CONVERT(varchar(19), CAST(P.lastHeartbeatUtc AT TIME ZONE 'UTC' AT TIME ZONE @tz AS datetime2(0)), 126) AS lastActivity,
	       DATEDIFF(minute, P.lastHeartbeatUtc, @now)                 AS minutesAgo,
	       CAST(CASE WHEN P.lastHeartbeatUtc >= DATEADD(minute, -ISNULL(@pIN_activeMinutes, 15), @now) THEN 1 ELSE 0 END AS bit) AS isWorkingNow,
	       ISNULL(S.totalSeconds, 0)                                  AS todaySeconds
	FROM dbo.E2M_Developer_M D
	OUTER APPLY (SELECT TOP (1) W.projectName, W.lastHeartbeatUtc
	             FROM dbo.E2M_Waka_Project_T W
	             WHERE W.developerId = D.id
	             ORDER BY W.lastHeartbeatUtc DESC) P
	OUTER APPLY (SELECT X.totalSeconds FROM dbo.E2M_Waka_Daily_Summary_T X
	             WHERE X.developerId = D.id AND X.activityDate = @today) S
	WHERE D.isDeleted = 0 AND D.isActive = 1
	  AND (@pIN_developerId IS NULL OR D.id = @pIN_developerId)
	  AND (@pIN_teamId IS NULL OR D.userId IN (SELECT TU.userId FROM dbo.E2M_Team_User_T TU WHERE TU.teamId = @pIN_teamId))
	ORDER BY CASE WHEN P.lastHeartbeatUtc IS NULL THEN 1 ELSE 0 END, P.lastHeartbeatUtc DESC, D.developerName;
END
GO


CREATE OR ALTER PROCEDURE dbo.PRC_Get_Activity_Projects
	@pIN_fromDate      date,
	@pIN_toDate        date,
	@pIN_developerId   int         = NULL,
	@pIN_teamId        int         = NULL,
	@pIN_activeMinutes int         = 15,
	@pIN_timeZone      varchar(60) = 'India Standard Time'
AS
BEGIN
	SET NOCOUNT ON;

	DECLARE @tz  varchar(60) = ISNULL(NULLIF(@pIN_timeZone, ''), 'India Standard Time');
	DECLARE @now datetime2(0) = SYSUTCDATETIME();

	SELECT D.id INTO #dev
	FROM dbo.E2M_Developer_M D
	WHERE (@pIN_developerId IS NULL OR D.id = @pIN_developerId)
	  AND (@pIN_teamId IS NULL OR D.userId IN (SELECT TU.userId FROM dbo.E2M_Team_User_T TU WHERE TU.teamId = @pIN_teamId));

	SELECT B.itemName AS projectName,
	       SUM(B.totalSeconds) AS totalSeconds,
	       COUNT(DISTINCT B.developerId) AS developerCount,
	       COUNT(DISTINCT B.activityDate) AS dayCount,
	       SUM(ISNULL(B.aiAdditions, 0) + ISNULL(B.aiDeletions, 0)) AS aiLines,
	       SUM(ISNULL(B.humanAdditions, 0) + ISNULL(B.humanDeletions, 0)) AS humanLines,
	       SUM(ISNULL(B.aiCostUsd, 0)) AS aiCostUsd,
	       MAX(B.activityDate) AS lastDay
	INTO #proj
	FROM dbo.E2M_Waka_Daily_Breakdown_T B
	JOIN #dev ON #dev.id = B.developerId
	WHERE B.dimension = 'project' AND B.activityDate BETWEEN @pIN_fromDate AND @pIN_toDate
	GROUP BY B.itemName;

	SELECT P.projectName,
	       P.totalSeconds,
	       ROUND(P.totalSeconds / 3600.0, 2)                             AS hours,
	       P.developerCount,
	       P.dayCount,
	       P.aiLines, P.humanLines,
	       CAST(ROUND(100.0 * P.aiLines / NULLIF(P.aiLines + P.humanLines, 0), 1) AS float) AS aiLinePct,
	       ROUND(P.aiCostUsd, 2)                                         AS aiCostUsd,
	       CONVERT(varchar(10), P.lastDay, 23)                           AS lastActiveDate,
	       (SELECT COUNT(DISTINCT X.itemName) FROM dbo.E2M_Waka_Daily_Breakdown_T X JOIN #dev ON #dev.id = X.developerId
	         WHERE X.dimension = 'branch' AND X.projectName = P.projectName
	           AND X.activityDate BETWEEN @pIN_fromDate AND @pIN_toDate) AS branchCount,
	       (SELECT COUNT(DISTINCT C.commitHash) FROM dbo.E2M_Waka_Commit_T C JOIN #dev ON #dev.id = C.developerId
	         WHERE C.projectName = P.projectName
	           AND CAST(C.authorDateUtc AT TIME ZONE 'UTC' AT TIME ZONE @tz AS date) BETWEEN @pIN_fromDate AND @pIN_toDate) AS commitCount,
	       ISNULL(R.repositoryUrl, '')                                   AS repositoryUrl,
	       ISNULL(R.repositoryProvider, '')                              AS repositoryProvider,
	       CONVERT(varchar(19), CAST(R.lastHeartbeatUtc AT TIME ZONE 'UTC' AT TIME ZONE @tz AS datetime2(0)), 126) AS lastActivity,
	       ISNULL(R.workingNow, 0)                                       AS workingNowCount
	FROM #proj P
	OUTER APPLY (SELECT MAX(W.repositoryUrl) AS repositoryUrl, MAX(W.repositoryProvider) AS repositoryProvider,
	                    MAX(W.lastHeartbeatUtc) AS lastHeartbeatUtc,
	                    SUM(CASE WHEN W.lastHeartbeatUtc >= DATEADD(minute, -ISNULL(@pIN_activeMinutes, 15), @now) THEN 1 ELSE 0 END) AS workingNow
	             FROM dbo.E2M_Waka_Project_T W JOIN #dev ON #dev.id = W.developerId
	             WHERE W.projectName = P.projectName) R
	ORDER BY ISNULL(R.workingNow, 0) DESC, P.totalSeconds DESC;
END
GO


CREATE OR ALTER PROCEDURE dbo.PRC_Get_Project_Developers
	@pIN_projectName   nvarchar(400),
	@pIN_fromDate      date,
	@pIN_toDate        date,
	@pIN_developerId   int         = NULL,
	@pIN_teamId        int         = NULL,
	@pIN_activeMinutes int         = 15,
	@pIN_timeZone      varchar(60) = 'India Standard Time'
AS
BEGIN
	SET NOCOUNT ON;

	DECLARE @tz  varchar(60) = ISNULL(NULLIF(@pIN_timeZone, ''), 'India Standard Time');
	DECLARE @now datetime2(0) = SYSUTCDATETIME();

	SELECT D.id AS developerId,
	       D.developerName,
	       dbo.FN_Get_User_Teams(D.userId) AS team,
	       A.totalSeconds,
	       ROUND(A.totalSeconds / 3600.0, 2) AS hours,
	       A.activeDays,
	       A.aiLines, A.humanLines,
	       CAST(ROUND(100.0 * A.aiLines / NULLIF(A.aiLines + A.humanLines, 0), 1) AS float) AS aiLinePct,
	       ISNULL(TB.itemName, '') AS topBranch,
	       (SELECT COUNT(DISTINCT C.commitHash) FROM dbo.E2M_Waka_Commit_T C
	         WHERE C.projectName = @pIN_projectName
	           AND (C.authorEmail = D.email OR (D.wakaUsername IS NOT NULL AND C.authorUsername = D.wakaUsername))
	           AND CAST(C.authorDateUtc AT TIME ZONE 'UTC' AT TIME ZONE @tz AS date) BETWEEN @pIN_fromDate AND @pIN_toDate) AS commitCount,
	       CONVERT(varchar(19), CAST(W.lastHeartbeatUtc AT TIME ZONE 'UTC' AT TIME ZONE @tz AS datetime2(0)), 126) AS lastActivity,
	       CAST(CASE WHEN W.lastHeartbeatUtc >= DATEADD(minute, -ISNULL(@pIN_activeMinutes, 15), @now) THEN 1 ELSE 0 END AS bit) AS isWorkingNow
	FROM dbo.E2M_Developer_M D
	CROSS APPLY (SELECT SUM(B.totalSeconds) AS totalSeconds, COUNT(DISTINCT B.activityDate) AS activeDays,
	                    SUM(ISNULL(B.aiAdditions, 0) + ISNULL(B.aiDeletions, 0)) AS aiLines,
	                    SUM(ISNULL(B.humanAdditions, 0) + ISNULL(B.humanDeletions, 0)) AS humanLines
	             FROM dbo.E2M_Waka_Daily_Breakdown_T B
	             WHERE B.developerId = D.id AND B.dimension = 'project' AND B.itemName = @pIN_projectName
	               AND B.activityDate BETWEEN @pIN_fromDate AND @pIN_toDate
	             HAVING SUM(B.totalSeconds) > 0) A
	OUTER APPLY (SELECT TOP (1) B.itemName FROM dbo.E2M_Waka_Daily_Breakdown_T B
	             WHERE B.developerId = D.id AND B.dimension = 'branch' AND B.projectName = @pIN_projectName
	               AND B.activityDate BETWEEN @pIN_fromDate AND @pIN_toDate
	             GROUP BY B.itemName ORDER BY SUM(B.totalSeconds) DESC) TB
	OUTER APPLY (SELECT MAX(X.lastHeartbeatUtc) AS lastHeartbeatUtc FROM dbo.E2M_Waka_Project_T X
	             WHERE X.developerId = D.id AND X.projectName = @pIN_projectName) W
	WHERE (@pIN_developerId IS NULL OR D.id = @pIN_developerId)
	  AND (@pIN_teamId IS NULL OR D.userId IN (SELECT TU.userId FROM dbo.E2M_Team_User_T TU WHERE TU.teamId = @pIN_teamId))
	ORDER BY A.totalSeconds DESC;
END
GO


/* Same row shape as PRC_Get_Activity_Daily (activityDate, developerId, developerName, totalSeconds) — reuses the daily chart. */
CREATE OR ALTER PROCEDURE dbo.PRC_Get_Project_Daily
	@pIN_projectName nvarchar(400),
	@pIN_fromDate    date,
	@pIN_toDate      date,
	@pIN_developerId int = NULL,
	@pIN_teamId      int = NULL
AS
BEGIN
	SET NOCOUNT ON;

	SELECT CONVERT(varchar(10), B.activityDate, 23) AS activityDate,
	       B.developerId,
	       D.developerName,
	       SUM(B.totalSeconds) AS totalSeconds,
	       ROUND(SUM(B.totalSeconds) / 3600.0, 2) AS codingHours,
	       SUM(ISNULL(B.aiAdditions, 0)) AS aiAdditions, SUM(ISNULL(B.aiDeletions, 0)) AS aiDeletions,
	       SUM(ISNULL(B.humanAdditions, 0)) AS humanAdditions, SUM(ISNULL(B.humanDeletions, 0)) AS humanDeletions
	FROM dbo.E2M_Waka_Daily_Breakdown_T B
	JOIN dbo.E2M_Developer_M D ON D.id = B.developerId
	WHERE B.dimension = 'project' AND B.itemName = @pIN_projectName
	  AND B.activityDate BETWEEN @pIN_fromDate AND @pIN_toDate
	  AND (@pIN_developerId IS NULL OR B.developerId = @pIN_developerId)
	  AND (@pIN_teamId IS NULL OR D.userId IN (SELECT TU.userId FROM dbo.E2M_Team_User_T TU WHERE TU.teamId = @pIN_teamId))
	GROUP BY B.activityDate, B.developerId, D.developerName
	ORDER BY B.activityDate, D.developerName;
END
GO


/*
   Branch status from activity (WakaTime has no merge / PR state):
     ACTIVE = worked on today or yesterday · IDLE = within 7 days · STALE = older
*/
CREATE OR ALTER PROCEDURE dbo.PRC_Get_Project_Branches
	@pIN_projectName nvarchar(400),
	@pIN_fromDate    date,
	@pIN_toDate      date,
	@pIN_developerId int         = NULL,
	@pIN_teamId      int         = NULL,
	@pIN_today       date        = NULL,
	@pIN_timeZone    varchar(60) = 'India Standard Time'
AS
BEGIN
	SET NOCOUNT ON;

	DECLARE @tz    varchar(60) = ISNULL(NULLIF(@pIN_timeZone, ''), 'India Standard Time');
	DECLARE @today date = ISNULL(@pIN_today, CAST(SYSDATETIMEOFFSET() AT TIME ZONE @tz AS date));

	SELECT D.id INTO #dev
	FROM dbo.E2M_Developer_M D
	WHERE (@pIN_developerId IS NULL OR D.id = @pIN_developerId)
	  AND (@pIN_teamId IS NULL OR D.userId IN (SELECT TU.userId FROM dbo.E2M_Team_User_T TU WHERE TU.teamId = @pIN_teamId));

	SELECT B.itemName AS branch,
	       SUM(B.totalSeconds) AS totalSeconds,
	       COUNT(DISTINCT B.developerId) AS developerCount,
	       MIN(B.activityDate) AS firstDay,
	       MAX(B.activityDate) AS lastDay
	INTO #br
	FROM dbo.E2M_Waka_Daily_Breakdown_T B
	JOIN #dev ON #dev.id = B.developerId
	WHERE B.dimension = 'branch' AND B.projectName = @pIN_projectName
	  AND B.activityDate BETWEEN @pIN_fromDate AND @pIN_toDate
	GROUP BY B.itemName;

	SELECT R.branch,
	       R.totalSeconds,
	       ROUND(R.totalSeconds / 3600.0, 2) AS hours,
	       R.developerCount,
	       ISNULL(STUFF((SELECT DISTINCT N', ' + D.developerName
	                     FROM dbo.E2M_Waka_Daily_Breakdown_T B
	                     JOIN #dev ON #dev.id = B.developerId
	                     JOIN dbo.E2M_Developer_M D ON D.id = B.developerId
	                     WHERE B.dimension = 'branch' AND B.projectName = @pIN_projectName AND B.itemName = R.branch
	                       AND B.activityDate BETWEEN @pIN_fromDate AND @pIN_toDate
	                     FOR XML PATH(''), TYPE).value('.', 'nvarchar(max)'), 1, 2, N''), N'') AS developers,
	       CONVERT(varchar(10), R.firstDay, 23) AS firstActiveDate,
	       CONVERT(varchar(10), L.lastEver, 23) AS lastActiveDate,
	       CASE WHEN DATEDIFF(day, L.lastEver, @today) <= 1 THEN 'ACTIVE'
	            WHEN DATEDIFF(day, L.lastEver, @today) <= 7 THEN 'IDLE'
	            ELSE 'STALE' END AS branchStatus,
	       ISNULL(C.commitCount, 0) AS commitCount,
	       ISNULL(LC.[message], '') AS lastCommitMessage,
	       CONVERT(varchar(19), CAST(LC.authorDateUtc AT TIME ZONE 'UTC' AT TIME ZONE @tz AS datetime2(0)), 126) AS lastCommitDate
	FROM #br R
	OUTER APPLY (SELECT MAX(B.activityDate) AS lastEver FROM dbo.E2M_Waka_Daily_Breakdown_T B JOIN #dev ON #dev.id = B.developerId
	             WHERE B.dimension = 'branch' AND B.projectName = @pIN_projectName AND B.itemName = R.branch) L
	OUTER APPLY (SELECT COUNT(DISTINCT X.commitHash) AS commitCount FROM dbo.E2M_Waka_Commit_T X
	             WHERE X.projectName = @pIN_projectName AND X.branch = R.branch) C
	OUTER APPLY (SELECT TOP (1) X.[message], X.authorDateUtc FROM dbo.E2M_Waka_Commit_T X
	             WHERE X.projectName = @pIN_projectName AND X.branch = R.branch
	             ORDER BY X.authorDateUtc DESC) LC
	ORDER BY L.lastEver DESC, R.totalSeconds DESC;
END
GO


/*
   Commit messages for one project. A commit fetched through several developers'
   tokens is listed once; developerName = the developer whose e-mail / WakaTime
   username matches the commit author (blank when the author isn't a tracked developer).
*/
CREATE OR ALTER PROCEDURE dbo.PRC_Get_Project_Commits
	@pIN_projectName nvarchar(400),
	@pIN_fromDate    date,
	@pIN_toDate      date,
	@pIN_branch      nvarchar(400) = NULL,
	@pIN_top         int           = 100,
	@pIN_timeZone    varchar(60)   = 'India Standard Time'
AS
BEGIN
	SET NOCOUNT ON;

	DECLARE @tz varchar(60) = ISNULL(NULLIF(@pIN_timeZone, ''), 'India Standard Time');

	;WITH C AS (
		SELECT X.*, ROW_NUMBER() OVER (PARTITION BY X.commitHash ORDER BY X.syncedDate DESC) AS rn
		FROM dbo.E2M_Waka_Commit_T X
		WHERE X.projectName = @pIN_projectName
		  AND (NULLIF(@pIN_branch, '') IS NULL OR X.branch = @pIN_branch)
		  AND CAST(X.authorDateUtc AT TIME ZONE 'UTC' AT TIME ZONE @tz AS date) BETWEEN @pIN_fromDate AND @pIN_toDate
	)
	SELECT TOP (ISNULL(@pIN_top, 100))
	       C.commitHash,
	       ISNULL(C.truncatedHash, LEFT(C.commitHash, 7)) AS truncatedHash,
	       ISNULL(C.branch, '') AS branch,
	       ISNULL(C.[message], '') AS [message],
	       ISNULL(C.authorName, '') AS authorName,
	       ISNULL(C.authorUsername, '') AS authorUsername,
	       CONVERT(varchar(19), CAST(C.authorDateUtc AT TIME ZONE 'UTC' AT TIME ZONE @tz AS datetime2(0)), 126) AS commitDate,
	       ISNULL(C.totalSeconds, 0) AS totalSeconds,
	       ISNULL(C.htmlUrl, '') AS htmlUrl,
	       ISNULL((SELECT TOP (1) D.developerName FROM dbo.E2M_Developer_M D
	               WHERE D.email = C.authorEmail OR (D.wakaUsername IS NOT NULL AND D.wakaUsername = C.authorUsername)
	               ORDER BY D.isDeleted, D.id), '') AS developerName
	FROM C
	WHERE C.rn = 1
	ORDER BY C.authorDateUtc DESC;
END
GO
