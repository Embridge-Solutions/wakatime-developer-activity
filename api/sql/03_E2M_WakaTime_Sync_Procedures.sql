/* =============================================================================
   DEVELOPER ACTIVITY — WakaTime sync procedures
   (called by the API, services/wakatime-services/helpers/store.js)

     PRC_Start_Waka_Sync_Run            one run at a time — answers OK or ALREADY_RUNNING
     PRC_Finish_Waka_Sync_Run           @pIN_runId, counts, status
     PRC_Get_Waka_Sync_Runs             @pIN_top
     PRC_Get_Developers_For_Waka_Sync   @pIN_developerId (NULL = everyone)
     PRC_Save_Waka_Developer_Day        @pIN_developerId, @pIN_activityDate, JSON payloads
     PRC_Save_Waka_User_Agents          @pIN_developerId, @pIN_agentsJson
     PRC_Save_Waka_Projects             @pIN_developerId, @pIN_projectsJson — last activity per project ("working now")
     PRC_Save_Waka_Commits              @pIN_developerId, @pIN_projectName, @pIN_commitsJson
     PRC_Insert_Waka_Sync_Log           named parameters
     PRC_Get_Waka_Sync_Logs             @pIN_top, @pIN_developerId, @pIN_syncStatus, @pIN_fromDate

   No duplicates:
     · a run can only start when no other run is RUNNING (any API instance)
     · each developer-day is replaced inside one transaction, under a lock
     · rows are grouped / DISTINCT before insert, so a repeated item can't double count

   Run after 01_E2M_WakaTime_Tables.sql. Re-runnable.
============================================================================= */

-- Filtered unique indexes need these ON, both when created and in every procedure that writes the tables
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO


/* ─── Sync runs ────────────────────────────────────────────────────────────── */

/*
   Starts a run unless another one is RUNNING. A RUNNING run older than
   @pIN_staleMinutes (server stopped mid-run) is closed as FAILED first.
   Answers: resultCode OK / ALREADY_RUNNING, runId (the running one when busy).
*/
CREATE OR ALTER PROCEDURE dbo.PRC_Start_Waka_Sync_Run
	@pIN_runId         uniqueidentifier,
	@pIN_triggeredBy   nvarchar(150) = NULL,
	@pIN_developerId   int           = NULL,
	@pIN_activityDates nvarchar(400) = NULL,
	@pIN_staleMinutes  int           = 240
AS
BEGIN
	SET NOCOUNT ON;
	SET XACT_ABORT ON;

	BEGIN TRANSACTION;
	-- Serialises "is anything running?" + insert across every connection
	DECLARE @lockResult int;
	EXEC @lockResult = sp_getapplock @Resource = 'E2M_Waka_Sync_Run', @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 10000;
	IF @lockResult < 0
		THROW 50001, 'Could not lock E2M_Waka_Sync_Run — try again', 1;

	UPDATE dbo.E2M_Waka_Sync_Run_T
	SET runStatus    = 'FAILED',
	    errorMessage = 'Run did not finish (server stopped?) — closed automatically',
	    finishedDate = GETDATE()
	WHERE runStatus = 'RUNNING'
	  AND startedDate < DATEADD(minute, -ISNULL(@pIN_staleMinutes, 240), GETDATE());

	DECLARE @running uniqueidentifier =
		(SELECT TOP (1) runId FROM dbo.E2M_Waka_Sync_Run_T WHERE runStatus = 'RUNNING' ORDER BY startedDate DESC);

	IF @running IS NOT NULL
	BEGIN
		COMMIT TRANSACTION;
		SELECT 'ALREADY_RUNNING' AS resultCode, CAST(@running AS varchar(36)) AS runId;
		RETURN;
	END

	INSERT INTO dbo.E2M_Waka_Sync_Run_T (runId, triggeredBy, developerId, activityDates, runStatus, startedDate)
	VALUES (@pIN_runId, @pIN_triggeredBy, @pIN_developerId, @pIN_activityDates, 'RUNNING', GETDATE());

	COMMIT TRANSACTION;
	SELECT 'OK' AS resultCode, CAST(@pIN_runId AS varchar(36)) AS runId;
END
GO


CREATE OR ALTER PROCEDURE dbo.PRC_Finish_Waka_Sync_Run
	@pIN_runId          uniqueidentifier,
	@pIN_runStatus      varchar(20),            -- COMPLETED / FAILED
	@pIN_developerCount int            = NULL,
	@pIN_okCount        int            = NULL,
	@pIN_failedCount    int            = NULL,
	@pIN_errorMessage   nvarchar(2000) = NULL
AS
BEGIN
	SET NOCOUNT ON;

	UPDATE dbo.E2M_Waka_Sync_Run_T
	SET runStatus      = @pIN_runStatus,
	    developerCount = @pIN_developerCount,
	    okCount        = @pIN_okCount,
	    failedCount    = @pIN_failedCount,
	    errorMessage   = @pIN_errorMessage,
	    finishedDate   = GETDATE()
	WHERE runId = @pIN_runId;
END
GO


CREATE OR ALTER PROCEDURE dbo.PRC_Get_Waka_Sync_Runs
	@pIN_top int = 50
AS
BEGIN
	SET NOCOUNT ON;

	SELECT TOP (ISNULL(@pIN_top, 50))
	       CAST(R.runId AS varchar(36))                AS runId,
	       ISNULL(R.triggeredBy, '')                   AS triggeredBy,
	       R.developerId,
	       ISNULL(D.developerName, '')                 AS developerName,
	       ISNULL(R.activityDates, '')                 AS activityDates,
	       R.runStatus,
	       R.developerCount,
	       R.okCount,
	       R.failedCount,
	       ISNULL(R.errorMessage, '')                  AS errorMessage,
	       CONVERT(varchar(19), R.startedDate, 126)    AS startedDate,
	       CONVERT(varchar(19), R.finishedDate, 126)   AS finishedDate,
	       DATEDIFF(second, R.startedDate, ISNULL(R.finishedDate, GETDATE())) AS durationSeconds
	FROM dbo.E2M_Waka_Sync_Run_T R
	LEFT JOIN dbo.E2M_Developer_M D ON D.id = R.developerId
	ORDER BY R.startedDate DESC;
END
GO


/* ─── Collection ───────────────────────────────────────────────────────────── */

/* Active, not deleted, with a token that WakaTime has not rejected. */
CREATE OR ALTER PROCEDURE dbo.PRC_Get_Developers_For_Waka_Sync
	@pIN_developerId int = NULL
AS
BEGIN
	SET NOCOUNT ON;

	SELECT D.id AS developerId,
	       D.developerName,
	       D.wakaApiKeyEnc
	FROM dbo.E2M_Developer_M D
	WHERE D.isDeleted = 0
	  AND D.isActive = 1
	  AND D.wakaApiKeyEnc IS NOT NULL
	  AND D.keyStatus <> 'INVALID'
	  AND (@pIN_developerId IS NULL OR D.id = @pIN_developerId)
	ORDER BY D.id;
END
GO


/*
   Replaces one developer-day in a single transaction, so re-running a day
   never creates duplicates. Payloads are JSON built by the API
   (services/wakatime-services/helpers/transform.js):

   @pIN_summaryJson    { "totalSeconds": 12600, "totalText": "3 hrs 30 mins", "heartbeatCount": 812,
                         "firstActivityUtc": "2026-10-18 03:45:10.120", "lastActivityUtc": "...",
                         "aiAdditions": 120, "aiDeletions": 8, "humanAdditions": 64, ..., "aiCostUsd": 0.42 }
   @pIN_breakdownJson  [ { "dimension": "branch", "projectName": "E2M", "itemName": "ES-123-fix",
                           "totalSeconds": 7000, "pct": 77, "aiAdditions": 40, ... }, ... ]
   @pIN_durationsJson  [ { "sliceBy": "project", "sliceValue": "E2M", "startUtc": "...", "durationSeconds": 900, ... } ]
   @pIN_heartbeatsJson [ { "hbTimeUtc": "...", "entity": "/src/a.ts", "entityType": "file", ... } ]
   @pIN_aiModelsJson   [ { "modelName": "claude-sonnet", "lineChanges": 120, "inputTokens": 5400, "costUsd": 0.31 } ]
*/
CREATE OR ALTER PROCEDURE dbo.PRC_Save_Waka_Developer_Day
	@pIN_developerId    int,
	@pIN_activityDate   date,
	@pIN_summaryJson    nvarchar(max),
	@pIN_rawSummaryJson nvarchar(max) = NULL,
	@pIN_breakdownJson  nvarchar(max) = NULL,
	@pIN_durationsJson  nvarchar(max) = NULL,
	@pIN_heartbeatsJson nvarchar(max) = NULL,
	@pIN_aiModelsJson   nvarchar(max) = NULL
AS
BEGIN
	SET NOCOUNT ON;
	SET XACT_ABORT ON;   -- any error rolls the whole day back

	DECLARE @lock nvarchar(255) = CONCAT('E2M_Waka_Day_', @pIN_developerId, '_', CONVERT(varchar(10), @pIN_activityDate, 23));

	BEGIN TRANSACTION;
	-- Two saves of the same developer-day wait for each other instead of mixing rows
	DECLARE @lockResult int;
	EXEC @lockResult = sp_getapplock @Resource = @lock, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 60000;
	IF @lockResult < 0
		THROW 50002, 'Another save of this developer-day is still running', 1;

	DELETE FROM dbo.E2M_Waka_AI_Model_Daily_T  WHERE developerId = @pIN_developerId AND activityDate = @pIN_activityDate;
	DELETE FROM dbo.E2M_Waka_Heartbeats_T      WHERE developerId = @pIN_developerId AND activityDate = @pIN_activityDate;
	DELETE FROM dbo.E2M_Waka_Durations_T       WHERE developerId = @pIN_developerId AND activityDate = @pIN_activityDate;
	DELETE FROM dbo.E2M_Waka_Daily_Breakdown_T WHERE developerId = @pIN_developerId AND activityDate = @pIN_activityDate;
	DELETE FROM dbo.E2M_Waka_Daily_Summary_T   WHERE developerId = @pIN_developerId AND activityDate = @pIN_activityDate;

	INSERT INTO dbo.E2M_Waka_Daily_Summary_T
		(developerId, activityDate, totalSeconds, totalText, heartbeatCount,
		 firstActivityUtc, lastActivityUtc, rawSummaryJson,
		 aiAdditions, aiDeletions, humanAdditions, humanDeletions, aiInputTokens, aiOutputTokens,
		 aiSessions, aiPromptEvents, aiPromptLengthSum, aiCostUsd, syncedDate)
	SELECT @pIN_developerId, @pIN_activityDate, ISNULL(S.totalSeconds, 0), S.totalText, ISNULL(S.heartbeatCount, 0),
	       S.firstActivityUtc, S.lastActivityUtc, @pIN_rawSummaryJson,
	       S.aiAdditions, S.aiDeletions, S.humanAdditions, S.humanDeletions, S.aiInputTokens, S.aiOutputTokens,
	       S.aiSessions, S.aiPromptEvents, S.aiPromptLengthSum, S.aiCostUsd, GETDATE()
	FROM OPENJSON(@pIN_summaryJson)
	WITH (
		totalSeconds      float        '$.totalSeconds',
		totalText         nvarchar(50) '$.totalText',
		heartbeatCount    int          '$.heartbeatCount',
		firstActivityUtc  datetime2(3) '$.firstActivityUtc',
		lastActivityUtc   datetime2(3) '$.lastActivityUtc',
		aiAdditions       int          '$.aiAdditions',
		aiDeletions       int          '$.aiDeletions',
		humanAdditions    int          '$.humanAdditions',
		humanDeletions    int          '$.humanDeletions',
		aiInputTokens     bigint       '$.aiInputTokens',
		aiOutputTokens    bigint       '$.aiOutputTokens',
		aiSessions        int          '$.aiSessions',
		aiPromptEvents    int          '$.aiPromptEvents',
		aiPromptLengthSum bigint       '$.aiPromptLengthSum',
		aiCostUsd         float        '$.aiCostUsd'
	) S;

	-- Grouped: the same item twice in a response is stored once
	INSERT INTO dbo.E2M_Waka_Daily_Breakdown_T
		(developerId, activityDate, dimension, projectName, itemName, totalSeconds, pct,
		 aiAdditions, aiDeletions, humanAdditions, humanDeletions, aiInputTokens, aiOutputTokens, aiCostUsd, syncedDate)
	SELECT @pIN_developerId, @pIN_activityDate, B.dimension, ISNULL(B.projectName, ''), B.itemName,
	       SUM(ISNULL(B.totalSeconds, 0)), MAX(B.pct),
	       SUM(B.aiAdditions), SUM(B.aiDeletions), SUM(B.humanAdditions), SUM(B.humanDeletions),
	       SUM(B.aiInputTokens), SUM(B.aiOutputTokens), SUM(B.aiCostUsd), GETDATE()
	FROM OPENJSON(ISNULL(@pIN_breakdownJson, '[]'))
	WITH (
		dimension      varchar(30)    '$.dimension',
		projectName    nvarchar(400)  '$.projectName',
		itemName       nvarchar(1000) '$.itemName',
		totalSeconds   float          '$.totalSeconds',
		pct            float          '$.pct',
		aiAdditions    int            '$.aiAdditions',
		aiDeletions    int            '$.aiDeletions',
		humanAdditions int            '$.humanAdditions',
		humanDeletions int            '$.humanDeletions',
		aiInputTokens  bigint         '$.aiInputTokens',
		aiOutputTokens bigint         '$.aiOutputTokens',
		aiCostUsd      float          '$.aiCostUsd'
	) B
	WHERE B.dimension IS NOT NULL AND B.itemName IS NOT NULL
	GROUP BY B.dimension, ISNULL(B.projectName, ''), B.itemName;

	INSERT INTO dbo.E2M_Waka_Durations_T
		(developerId, activityDate, sliceBy, sliceValue, startUtc, durationSeconds,
		 aiAdditions, aiDeletions, humanAdditions, humanDeletions,
		 aiInputTokens, aiOutputTokens, aiSessions, aiPromptEvents, aiCostUsd, syncedDate)
	SELECT DISTINCT @pIN_developerId, @pIN_activityDate, U.sliceBy, U.sliceValue, U.startUtc, ISNULL(U.durationSeconds, 0),
	       U.aiAdditions, U.aiDeletions, U.humanAdditions, U.humanDeletions,
	       U.aiInputTokens, U.aiOutputTokens, U.aiSessions, U.aiPromptEvents, U.aiCostUsd, GETDATE()
	FROM OPENJSON(ISNULL(@pIN_durationsJson, '[]'))
	WITH (
		sliceBy         varchar(30)    '$.sliceBy',
		sliceValue      nvarchar(1000) '$.sliceValue',
		startUtc        datetime2(3)   '$.startUtc',
		durationSeconds float          '$.durationSeconds',
		aiAdditions     int            '$.aiAdditions',
		aiDeletions     int            '$.aiDeletions',
		humanAdditions  int            '$.humanAdditions',
		humanDeletions  int            '$.humanDeletions',
		aiInputTokens   bigint         '$.aiInputTokens',
		aiOutputTokens  bigint         '$.aiOutputTokens',
		aiSessions      int            '$.aiSessions',
		aiPromptEvents  int            '$.aiPromptEvents',
		aiCostUsd       float          '$.aiCostUsd'
	) U
	WHERE U.startUtc IS NOT NULL;

	INSERT INTO dbo.E2M_Waka_Heartbeats_T
		(developerId, activityDate, hbTimeUtc, entity, entityType, category, project, branch, [language],
		 isWrite, lines, [lineNo], machineNameId, aiLineChanges, humanLineChanges,
		 aiSession, aiInputTokens, aiOutputTokens, aiPromptLength, aiSubscriptionPlan, syncedDate)
	SELECT DISTINCT @pIN_developerId, @pIN_activityDate, H.hbTimeUtc, H.entity, H.entityType, H.category, H.project, H.branch, H.[language],
	       H.isWrite, H.lines, H.[lineNo], H.machineNameId, H.aiLineChanges, H.humanLineChanges,
	       H.aiSession, H.aiInputTokens, H.aiOutputTokens, H.aiPromptLength, H.aiSubscriptionPlan, GETDATE()
	FROM OPENJSON(ISNULL(@pIN_heartbeatsJson, '[]'))
	WITH (
		hbTimeUtc          datetime2(3)   '$.hbTimeUtc',
		entity             nvarchar(1000) '$.entity',
		entityType         varchar(20)    '$.entityType',
		category           varchar(40)    '$.category',
		project            nvarchar(400)  '$.project',
		branch             nvarchar(400)  '$.branch',
		[language]         nvarchar(100)  '$.language',
		isWrite            bit            '$.isWrite',
		lines              int            '$.lines',
		[lineNo]           int            '$.lineNo',
		machineNameId      nvarchar(64)   '$.machineNameId',
		aiLineChanges      int            '$.aiLineChanges',
		humanLineChanges   int            '$.humanLineChanges',
		aiSession          nvarchar(100)  '$.aiSession',
		aiInputTokens      int            '$.aiInputTokens',
		aiOutputTokens     int            '$.aiOutputTokens',
		aiPromptLength     int            '$.aiPromptLength',
		aiSubscriptionPlan nvarchar(50)   '$.aiSubscriptionPlan'
	) H
	WHERE H.hbTimeUtc IS NOT NULL;

	INSERT INTO dbo.E2M_Waka_AI_Model_Daily_T
		(developerId, activityDate, modelName, lineChanges, inputTokens, outputTokens, cachedInputTokens, costUsd, syncedDate)
	SELECT @pIN_developerId, @pIN_activityDate, M.modelName,
	       SUM(M.lineChanges), SUM(M.inputTokens), SUM(M.outputTokens), SUM(M.cachedInputTokens), SUM(M.costUsd), GETDATE()
	FROM OPENJSON(ISNULL(@pIN_aiModelsJson, '[]'))
	WITH (
		modelName         nvarchar(200) '$.modelName',
		lineChanges       int           '$.lineChanges',
		inputTokens       bigint        '$.inputTokens',
		outputTokens      bigint        '$.outputTokens',
		cachedInputTokens bigint        '$.cachedInputTokens',
		costUsd           float         '$.costUsd'
	) M
	WHERE NULLIF(LTRIM(RTRIM(M.modelName)), '') IS NOT NULL
	GROUP BY M.modelName;

	COMMIT TRANSACTION;

	SELECT (SELECT COUNT(1) FROM dbo.E2M_Waka_Daily_Breakdown_T WHERE developerId = @pIN_developerId AND activityDate = @pIN_activityDate) AS breakdownRows,
	       (SELECT COUNT(1) FROM dbo.E2M_Waka_Durations_T       WHERE developerId = @pIN_developerId AND activityDate = @pIN_activityDate) AS durationRows,
	       (SELECT COUNT(1) FROM dbo.E2M_Waka_Heartbeats_T      WHERE developerId = @pIN_developerId AND activityDate = @pIN_activityDate) AS heartbeatRows,
	       (SELECT COUNT(1) FROM dbo.E2M_Waka_AI_Model_Daily_T  WHERE developerId = @pIN_developerId AND activityDate = @pIN_activityDate) AS aiModelRows;
END
GO


/*
   Insert or update a developer's editors / AI tools (WakaTime user agents).
   @pIN_agentsJson [ { "agentId": "…", "agentValue": "wakatime/… vscode/…", "editor": "VS Code",
                       "os": "Mac", "aiModel": "claude", "lastSeenUtc": "2026-10-18 09:12:00", ... } ]
*/
CREATE OR ALTER PROCEDURE dbo.PRC_Save_Waka_User_Agents
	@pIN_developerId int,
	@pIN_agentsJson  nvarchar(max)
AS
BEGIN
	SET NOCOUNT ON;

	MERGE dbo.E2M_Waka_User_Agent_T AS T
	USING (
		SELECT agentId, MAX(agentValue) AS agentValue, MAX(editor) AS editor, MAX(os) AS os,
		       MAX(agentVersion) AS agentVersion, MAX(aiModel) AS aiModel, MAX(aiModelVersion) AS aiModelVersion,
		       MAX(aiModelComplexity) AS aiModelComplexity,
		       CAST(MAX(CAST(isBrowserExtension AS int)) AS bit) AS isBrowserExtension,
		       CAST(MAX(CAST(isDesktopApp AS int)) AS bit) AS isDesktopApp,
		       MAX(lastSeenUtc) AS lastSeenUtc, MIN(createdUtc) AS createdUtc
		FROM OPENJSON(ISNULL(@pIN_agentsJson, '[]'))
		WITH (
			agentId            nvarchar(64)   '$.agentId',
			agentValue         nvarchar(1000) '$.agentValue',
			editor             nvarchar(100)  '$.editor',
			os                 nvarchar(100)  '$.os',
			agentVersion       nvarchar(100)  '$.agentVersion',
			aiModel            nvarchar(100)  '$.aiModel',
			aiModelVersion     nvarchar(100)  '$.aiModelVersion',
			aiModelComplexity  nvarchar(50)   '$.aiModelComplexity',
			isBrowserExtension bit            '$.isBrowserExtension',
			isDesktopApp       bit            '$.isDesktopApp',
			lastSeenUtc        datetime2(0)   '$.lastSeenUtc',
			createdUtc         datetime2(0)   '$.createdUtc'
		)
		WHERE agentId IS NOT NULL
		GROUP BY agentId
	) AS S
	ON T.developerId = @pIN_developerId AND T.agentId = S.agentId
	WHEN MATCHED THEN UPDATE SET
		agentValue = S.agentValue, editor = S.editor, os = S.os, agentVersion = S.agentVersion,
		aiModel = S.aiModel, aiModelVersion = S.aiModelVersion, aiModelComplexity = S.aiModelComplexity,
		isBrowserExtension = S.isBrowserExtension, isDesktopApp = S.isDesktopApp,
		lastSeenUtc = S.lastSeenUtc, createdUtc = S.createdUtc, syncedDate = GETDATE()
	WHEN NOT MATCHED THEN INSERT
		(developerId, agentId, agentValue, editor, os, agentVersion, aiModel, aiModelVersion, aiModelComplexity,
		 isBrowserExtension, isDesktopApp, lastSeenUtc, createdUtc, syncedDate)
		VALUES (@pIN_developerId, S.agentId, S.agentValue, S.editor, S.os, S.agentVersion, S.aiModel, S.aiModelVersion,
		        S.aiModelComplexity, S.isBrowserExtension, S.isDesktopApp, S.lastSeenUtc, S.createdUtc, GETDATE());

	SELECT COUNT(1) AS agentCount FROM dbo.E2M_Waka_User_Agent_T WHERE developerId = @pIN_developerId;
END
GO


/*
   One row per developer / date / run. Also keeps the developer's last sync
   on E2M_Developer_M; AUTH_ERROR marks the token INVALID so the next runs skip
   it until a new one is saved.
*/
CREATE OR ALTER PROCEDURE dbo.PRC_Insert_Waka_Sync_Log
	@pIN_runId          uniqueidentifier,
	@pIN_developerId    int,
	@pIN_activityDate   date,
	@pIN_syncStatus     varchar(20),
	@pIN_triggeredBy    nvarchar(150)  = NULL,
	@pIN_apiCalls       int            = NULL,
	@pIN_heartbeatCount int            = NULL,
	@pIN_totalSeconds   float          = NULL,
	@pIN_errorMessage   nvarchar(2000) = NULL,
	@pIN_startedDate    datetime
AS
BEGIN
	SET NOCOUNT ON;

	INSERT INTO dbo.E2M_Waka_Sync_Log_T
		(runId, developerId, activityDate, syncStatus, triggeredBy, apiCalls, heartbeatCount,
		 totalSeconds, errorMessage, startedDate, finishedDate)
	VALUES
		(@pIN_runId, @pIN_developerId, @pIN_activityDate, @pIN_syncStatus, @pIN_triggeredBy, @pIN_apiCalls, @pIN_heartbeatCount,
		 @pIN_totalSeconds, @pIN_errorMessage, @pIN_startedDate, GETDATE());

	UPDATE dbo.E2M_Developer_M
	SET lastSyncDate   = GETDATE(),
	    lastSyncStatus = @pIN_syncStatus,
	    keyStatus      = CASE @pIN_syncStatus
	                         WHEN 'AUTH_ERROR' THEN 'INVALID'
	                         WHEN 'SUCCESS'    THEN 'VALID'
	                         ELSE keyStatus
	                     END
	WHERE id = @pIN_developerId;
END
GO


/*
   EXEC PRC_Get_Waka_Sync_Logs                                   -- latest 200
   EXEC PRC_Get_Waka_Sync_Logs @pIN_syncStatus = 'FAILED', @pIN_fromDate = '2026-10-01'
*/
CREATE OR ALTER PROCEDURE dbo.PRC_Get_Waka_Sync_Logs
	@pIN_top         int         = 200,
	@pIN_developerId int         = NULL,
	@pIN_syncStatus  varchar(20) = NULL,
	@pIN_fromDate    date        = NULL,
	@pIN_runId       uniqueidentifier = NULL
AS
BEGIN
	SET NOCOUNT ON;

	SELECT TOP (ISNULL(@pIN_top, 200))
	       L.id,
	       CAST(L.runId AS varchar(36))                  AS runId,
	       L.developerId,
	       ISNULL(D.developerName, '')                   AS developerName,
	       CONVERT(varchar(10), L.activityDate, 23)      AS activityDate,
	       L.syncStatus,
	       ISNULL(L.triggeredBy, '')                     AS triggeredBy,
	       L.apiCalls,
	       L.heartbeatCount,
	       ROUND(ISNULL(L.totalSeconds, 0) / 3600.0, 2)  AS codingHours,
	       ISNULL(L.errorMessage, '')                    AS errorMessage,
	       CONVERT(varchar(19), L.startedDate, 126)      AS startedDate,
	       CONVERT(varchar(19), L.finishedDate, 126)     AS finishedDate
	FROM dbo.E2M_Waka_Sync_Log_T L
	LEFT JOIN dbo.E2M_Developer_M D ON D.id = L.developerId
	WHERE (@pIN_developerId IS NULL OR L.developerId = @pIN_developerId)
	  AND (NULLIF(@pIN_syncStatus, '') IS NULL OR L.syncStatus = @pIN_syncStatus)
	  AND (@pIN_fromDate IS NULL OR L.activityDate >= @pIN_fromDate)
	  AND (@pIN_runId IS NULL OR L.runId = @pIN_runId)
	ORDER BY L.id DESC;
END
GO


/*
   A developer's WakaTime projects (GET /users/current/projects), merged by name.
   Called by the nightly sync and by the light "live" job every few minutes.
   @pIN_projectsJson [ { "projectName": "E2M", "wakaProjectId": "…", "repositoryUrl": "https://github.com/…",
                         "repositoryName": "org/e2m", "repositoryProvider": "github", "defaultBranch": "main",
                         "firstHeartbeatUtc": "2026-01-02 10:00:00", "lastHeartbeatUtc": "2026-10-18 11:42:10" } ]
*/
CREATE OR ALTER PROCEDURE dbo.PRC_Save_Waka_Projects
	@pIN_developerId  int,
	@pIN_projectsJson nvarchar(max)
AS
BEGIN
	SET NOCOUNT ON;

	MERGE dbo.E2M_Waka_Project_T AS T
	USING (
		SELECT projectName,
		       MAX(wakaProjectId) AS wakaProjectId, MAX(repositoryUrl) AS repositoryUrl,
		       MAX(repositoryName) AS repositoryName, MAX(repositoryProvider) AS repositoryProvider,
		       MAX(defaultBranch) AS defaultBranch,
		       MIN(firstHeartbeatUtc) AS firstHeartbeatUtc, MAX(lastHeartbeatUtc) AS lastHeartbeatUtc
		FROM OPENJSON(ISNULL(@pIN_projectsJson, '[]'))
		WITH (
			projectName        nvarchar(400) '$.projectName',
			wakaProjectId      nvarchar(64)  '$.wakaProjectId',
			repositoryUrl      nvarchar(500) '$.repositoryUrl',
			repositoryName     nvarchar(300) '$.repositoryName',
			repositoryProvider nvarchar(50)  '$.repositoryProvider',
			defaultBranch      nvarchar(200) '$.defaultBranch',
			firstHeartbeatUtc  datetime2(0)  '$.firstHeartbeatUtc',
			lastHeartbeatUtc   datetime2(0)  '$.lastHeartbeatUtc'
		)
		WHERE NULLIF(LTRIM(RTRIM(projectName)), '') IS NOT NULL
		GROUP BY projectName
	) AS S
	ON T.developerId = @pIN_developerId AND T.projectName = S.projectName
	WHEN MATCHED THEN UPDATE SET
		wakaProjectId = S.wakaProjectId, repositoryUrl = S.repositoryUrl, repositoryName = S.repositoryName,
		repositoryProvider = S.repositoryProvider, defaultBranch = S.defaultBranch,
		firstHeartbeatUtc = S.firstHeartbeatUtc, lastHeartbeatUtc = S.lastHeartbeatUtc, syncedDate = GETDATE()
	WHEN NOT MATCHED THEN INSERT
		(developerId, projectName, wakaProjectId, repositoryUrl, repositoryName, repositoryProvider, defaultBranch,
		 firstHeartbeatUtc, lastHeartbeatUtc, syncedDate)
		VALUES (@pIN_developerId, S.projectName, S.wakaProjectId, S.repositoryUrl, S.repositoryName, S.repositoryProvider,
		        S.defaultBranch, S.firstHeartbeatUtc, S.lastHeartbeatUtc, GETDATE());

	SELECT COUNT(1) AS projectCount FROM dbo.E2M_Waka_Project_T WHERE developerId = @pIN_developerId;
END
GO


/*
   Commits WakaTime links to one project (GET /users/current/projects/:project/commits),
   merged by hash — a re-sync updates, never duplicates.
   @pIN_commitsJson [ { "commitHash": "…", "truncatedHash": "a1b2c3d", "branch": "main", "message": "Fix …",
                        "authorName": "Ravi", "authorEmail": "…", "authorUsername": "ravi",
                        "authorDateUtc": "2026-10-17 09:12:00", "totalSeconds": 1800, "htmlUrl": "https://…" } ]
*/
CREATE OR ALTER PROCEDURE dbo.PRC_Save_Waka_Commits
	@pIN_developerId int,
	@pIN_projectName nvarchar(400),
	@pIN_commitsJson nvarchar(max)
AS
BEGIN
	SET NOCOUNT ON;

	MERGE dbo.E2M_Waka_Commit_T AS T
	USING (
		SELECT commitHash,
		       MAX(truncatedHash) AS truncatedHash, MAX(branch) AS branch, MAX([message]) AS [message],
		       MAX(authorName) AS authorName, MAX(authorEmail) AS authorEmail, MAX(authorUsername) AS authorUsername,
		       MAX(authorDateUtc) AS authorDateUtc, MAX(totalSeconds) AS totalSeconds, MAX(htmlUrl) AS htmlUrl
		FROM OPENJSON(ISNULL(@pIN_commitsJson, '[]'))
		WITH (
			commitHash     varchar(64)    '$.commitHash',
			truncatedHash  varchar(16)    '$.truncatedHash',
			branch         nvarchar(400)  '$.branch',
			[message]      nvarchar(2000) '$.message',
			authorName     nvarchar(200)  '$.authorName',
			authorEmail    nvarchar(200)  '$.authorEmail',
			authorUsername nvarchar(100)  '$.authorUsername',
			authorDateUtc  datetime2(0)   '$.authorDateUtc',
			totalSeconds   float          '$.totalSeconds',
			htmlUrl        nvarchar(500)  '$.htmlUrl'
		)
		WHERE commitHash IS NOT NULL
		GROUP BY commitHash
	) AS S
	ON T.developerId = @pIN_developerId AND T.projectName = @pIN_projectName AND T.commitHash = S.commitHash
	WHEN MATCHED THEN UPDATE SET
		truncatedHash = S.truncatedHash, branch = S.branch, [message] = S.[message], authorName = S.authorName,
		authorEmail = S.authorEmail, authorUsername = S.authorUsername, authorDateUtc = S.authorDateUtc,
		totalSeconds = S.totalSeconds, htmlUrl = S.htmlUrl, syncedDate = GETDATE()
	WHEN NOT MATCHED THEN INSERT
		(developerId, projectName, commitHash, truncatedHash, branch, [message], authorName, authorEmail, authorUsername,
		 authorDateUtc, totalSeconds, htmlUrl, syncedDate)
		VALUES (@pIN_developerId, @pIN_projectName, S.commitHash, S.truncatedHash, S.branch, S.[message], S.authorName,
		        S.authorEmail, S.authorUsername, S.authorDateUtc, S.totalSeconds, S.htmlUrl, GETDATE());

	SELECT COUNT(1) AS commitCount FROM dbo.E2M_Waka_Commit_T WHERE developerId = @pIN_developerId AND projectName = @pIN_projectName;
END
GO
