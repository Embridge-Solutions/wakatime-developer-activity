/* =============================================================================
   DEVELOPER ACTIVITY (WakaTime) — tables
   -----------------------------------------------------------------------------
   E2M_Developer_M              one row per developer + their WakaTime API key (encrypted)
   E2M_Waka_Daily_Summary_T     one row per developer per day: totals + raw JSON
   E2M_Waka_Daily_Breakdown_T   time per project / language / editor / category /
                                operating_system / machine / dependency / branch / entity
   E2M_Waka_Durations_T         timeline: continuous work blocks
   E2M_Waka_Heartbeats_T        raw events: file, branch, line, write, AI vs human changes
   E2M_Waka_Sync_Log_T          one row per developer / date / sync run
   E2M_Waka_Sync_Run_T          one row per sync run (also stops two runs at the same time)
   E2M_Waka_AI_Model_Daily_T    AI model usage per developer per day: lines, tokens, cost
   E2M_Waka_User_Agent_T        editors / AI tools (WakaTime "user agents") each developer uses
   E2M_Waka_Project_T           each developer's WakaTime projects: repository + last activity ("working now")
   E2M_Waka_Commit_T            commits WakaTime links to a project: message, branch, author, coding time
   E2M_Team_M                   teams (Frontend Developer, Backend Developer, DB Data Analysis …)
   E2M_Team_User_T              team members — a user can be in many teams, a team has many users

   Section 7 adds the AI columns WakaTime reports (AI vs human lines, tokens,
   sessions, cost) to the tables above — safe on a database created earlier.

   activityDate is the business-timezone day (IST). Columns ending in Utc are UTC.
   Needs SQL Server 2016+ (database compatibility level 130+) for OPENJSON.

   Run order:  01_E2M_WakaTime_Tables.sql
               02_E2M_Developer_Procedures.sql
               03_E2M_WakaTime_Sync_Procedures.sql
               04_E2M_Activity_Dashboard_Procedures.sql
               05_E2M_Access_Scopes_Roles.sql   (after `npm run migrate` — needs E2M_Scopes / E2M_Role)
               06_E2M_Mail.sql                  (mail settings + log; SMTP itself is only in .env)
               07_E2M_Security_Settings.sql     (token protection password — bcrypt hash only)
   Re-runnable.
============================================================================= */

-- Filtered unique indexes need these ON, both when created and in every procedure that writes the tables
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO


/* ─── 1. Developers ────────────────────────────────────────────────────────── */

IF OBJECT_ID('dbo.E2M_Developer_M', 'U') IS NULL
BEGIN
	CREATE TABLE dbo.E2M_Developer_M
	(
		id               int IDENTITY(1,1) NOT NULL CONSTRAINT PK_E2M_Developer_M PRIMARY KEY,
		developerCode    varchar(30)    NULL,             -- employee code, optional
		developerName    nvarchar(150)  NOT NULL,
		email            nvarchar(200)  NOT NULL,          -- stored lower-case
		phone            varchar(20)    NULL,
		designation      nvarchar(100)  NULL,
		team             nvarchar(100)  NULL,
		userId           int            NULL,              -- E2M_User.id when the developer also logs in to this app

		-- WakaTime
		wakaApiKeyEnc    nvarchar(1000) NULL,              -- AES-256-GCM encrypted by the API, never plain text
		apiKeyHint       varchar(10)    NULL,              -- last 4 characters, shown on screen as ••••abcd
		wakaUserId       nvarchar(64)   NULL,
		wakaUsername     nvarchar(100)  NULL,
		wakaTimezone     varchar(64)    NULL,
		keyStatus        varchar(20)    NOT NULL CONSTRAINT DF_DEV_keyStatus DEFAULT ('NOT_SET'),   -- NOT_SET / VALID / INVALID
		keyVerifiedDate  datetime       NULL,
		lastSyncDate     datetime       NULL,
		lastSyncStatus   varchar(20)    NULL,              -- SUCCESS / FAILED / AUTH_ERROR

		isActive         bit            NOT NULL CONSTRAINT DF_DEV_isActive DEFAULT (1),   -- inactive = not collected
		createdBy        nvarchar(100)  NULL,
		createdDate      datetime       NOT NULL CONSTRAINT DF_DEV_createdDate DEFAULT (GETDATE()),
		updatedBy        nvarchar(100)  NULL,
		updatedDate      datetime       NULL,
		isDeleted        bit            NOT NULL CONSTRAINT DF_DEV_isDeleted DEFAULT (0),
		deletedBy        nvarchar(100)  NULL,
		deletedDate      datetime       NULL,
		CONSTRAINT CK_E2M_Developer_M_KeyStatus CHECK (keyStatus IN ('NOT_SET', 'VALID', 'INVALID'))
	);
END
GO

-- Unique among developers that are not deleted (a deleted developer's e-mail can be reused)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_E2M_Developer_M_Email')
	CREATE UNIQUE INDEX UX_E2M_Developer_M_Email ON dbo.E2M_Developer_M (email) WHERE isDeleted = 0;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_E2M_Developer_M_Code')
	CREATE UNIQUE INDEX UX_E2M_Developer_M_Code ON dbo.E2M_Developer_M (developerCode)
		WHERE isDeleted = 0 AND developerCode IS NOT NULL;
GO
-- One WakaTime account per developer, otherwise the same hours are counted twice
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_E2M_Developer_M_WakaUser')
	CREATE UNIQUE INDEX UX_E2M_Developer_M_WakaUser ON dbo.E2M_Developer_M (wakaUserId)
		WHERE isDeleted = 0 AND wakaUserId IS NOT NULL;
GO


/* ─── 2. Daily summary — one row per developer per day ─────────────────────── */

IF OBJECT_ID('dbo.E2M_Waka_Daily_Summary_T', 'U') IS NULL
BEGIN
	CREATE TABLE dbo.E2M_Waka_Daily_Summary_T
	(
		developerId       int           NOT NULL CONSTRAINT FK_WDS_Developer REFERENCES dbo.E2M_Developer_M (id),
		activityDate      date          NOT NULL,
		totalSeconds      float         NOT NULL CONSTRAINT DF_WDS_totalSeconds DEFAULT (0),
		totalText         nvarchar(50)  NULL,
		heartbeatCount    int           NOT NULL CONSTRAINT DF_WDS_heartbeatCount DEFAULT (0),
		firstActivityUtc  datetime2(3)  NULL,
		lastActivityUtc   datetime2(3)  NULL,
		rawSummaryJson    nvarchar(max) NULL,               -- full API response kept for re-processing
		syncedDate        datetime      NOT NULL CONSTRAINT DF_WDS_syncedDate DEFAULT (GETDATE()),
		CONSTRAINT PK_E2M_Waka_Daily_Summary_T PRIMARY KEY (developerId, activityDate)
	);
	CREATE INDEX IX_E2M_Waka_Daily_Summary_T_Date ON dbo.E2M_Waka_Daily_Summary_T (activityDate);
END
GO


/* ─── 3. Daily breakdown — time per project / language / branch / file … ──── */
/* branch and entity rows carry projectName; the other dimensions use ''        */

IF OBJECT_ID('dbo.E2M_Waka_Daily_Breakdown_T', 'U') IS NULL
BEGIN
	CREATE TABLE dbo.E2M_Waka_Daily_Breakdown_T
	(
		id            bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_E2M_Waka_Daily_Breakdown_T PRIMARY KEY,
		developerId   int            NOT NULL CONSTRAINT FK_WDB_Developer REFERENCES dbo.E2M_Developer_M (id),
		activityDate  date           NOT NULL,
		dimension     varchar(30)    NOT NULL,
		projectName   nvarchar(400)  NOT NULL CONSTRAINT DF_WDB_projectName DEFAULT (''),
		itemName      nvarchar(1000) NOT NULL,
		totalSeconds  float          NOT NULL,
		pct           float          NULL,
		syncedDate    datetime       NOT NULL CONSTRAINT DF_WDB_syncedDate DEFAULT (GETDATE())
	);
	CREATE INDEX IX_E2M_Waka_Daily_Breakdown_T_Dev ON dbo.E2M_Waka_Daily_Breakdown_T (developerId, activityDate, dimension);
END
GO


/* ─── 4. Durations — continuous work blocks ────────────────────────────────── */

IF OBJECT_ID('dbo.E2M_Waka_Durations_T', 'U') IS NULL
BEGIN
	CREATE TABLE dbo.E2M_Waka_Durations_T
	(
		id               bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_E2M_Waka_Durations_T PRIMARY KEY,
		developerId      int            NOT NULL CONSTRAINT FK_WDU_Developer REFERENCES dbo.E2M_Developer_M (id),
		activityDate     date           NOT NULL,
		sliceBy          varchar(30)    NOT NULL,          -- project (default), language, entity …
		sliceValue       nvarchar(1000) NULL,
		startUtc         datetime2(3)   NOT NULL,
		durationSeconds  float          NOT NULL,
		aiAdditions      int            NULL,
		aiDeletions      int            NULL,
		humanAdditions   int            NULL,
		humanDeletions   int            NULL,
		syncedDate       datetime       NOT NULL CONSTRAINT DF_WDU_syncedDate DEFAULT (GETDATE())
	);
	CREATE INDEX IX_E2M_Waka_Durations_T_Dev ON dbo.E2M_Waka_Durations_T (developerId, activityDate);
END
GO


/* ─── 5. Heartbeats — raw events (the big table) ───────────────────────────── */

IF OBJECT_ID('dbo.E2M_Waka_Heartbeats_T', 'U') IS NULL
BEGIN
	CREATE TABLE dbo.E2M_Waka_Heartbeats_T
	(
		id                bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_E2M_Waka_Heartbeats_T PRIMARY KEY,
		developerId       int            NOT NULL CONSTRAINT FK_WHB_Developer REFERENCES dbo.E2M_Developer_M (id),
		activityDate      date           NOT NULL,
		hbTimeUtc         datetime2(3)   NOT NULL,
		entity            nvarchar(1000) NULL,
		entityType        varchar(20)    NULL,
		category          varchar(40)    NULL,
		project           nvarchar(400)  NULL,
		branch            nvarchar(400)  NULL,
		[language]        nvarchar(100)  NULL,
		isWrite           bit            NULL,
		lines             int            NULL,
		[lineNo]          int            NULL,
		machineNameId     nvarchar(64)   NULL,
		aiLineChanges     int            NULL,
		humanLineChanges  int            NULL,
		syncedDate        datetime       NOT NULL CONSTRAINT DF_WHB_syncedDate DEFAULT (GETDATE())
	);
	CREATE INDEX IX_E2M_Waka_Heartbeats_T_Dev ON dbo.E2M_Waka_Heartbeats_T (developerId, activityDate);
END
GO


/* ─── 6. Sync log — one row per developer / date / run ─────────────────────── */

IF OBJECT_ID('dbo.E2M_Waka_Sync_Log_T', 'U') IS NULL
BEGIN
	CREATE TABLE dbo.E2M_Waka_Sync_Log_T
	(
		id              bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_E2M_Waka_Sync_Log_T PRIMARY KEY,
		runId           uniqueidentifier NOT NULL,
		developerId     int            NOT NULL,
		activityDate    date           NOT NULL,
		syncStatus      varchar(20)    NOT NULL,          -- SUCCESS / FAILED / AUTH_ERROR
		triggeredBy     nvarchar(150)  NULL,              -- scheduler / manual · username
		apiCalls        int            NULL,
		heartbeatCount  int            NULL,
		totalSeconds    float          NULL,
		errorMessage    nvarchar(2000) NULL,
		startedDate     datetime       NOT NULL,
		finishedDate    datetime       NULL
	);
	CREATE INDEX IX_E2M_Waka_Sync_Log_T_Started ON dbo.E2M_Waka_Sync_Log_T (startedDate DESC);
	CREATE INDEX IX_E2M_Waka_Sync_Log_T_Dev ON dbo.E2M_Waka_Sync_Log_T (developerId, activityDate);
END
GO


/* ─── 7. AI columns (WakaTime GenAI tracking) ─────────────────────────────── */
/* Added with ALTER so a database created before this version is upgraded in place. */

IF COL_LENGTH('dbo.E2M_Waka_Daily_Summary_T', 'aiAdditions') IS NULL
	ALTER TABLE dbo.E2M_Waka_Daily_Summary_T ADD
		aiAdditions        int    NULL,   -- lines added by GenAI
		aiDeletions        int    NULL,
		humanAdditions     int    NULL,   -- lines added by the developer
		humanDeletions     int    NULL,
		aiInputTokens      bigint NULL,
		aiOutputTokens     bigint NULL,
		aiSessions         int    NULL,   -- distinct AI sessions
		aiPromptEvents     int    NULL,   -- prompts sent
		aiPromptLengthSum  bigint NULL,
		aiCostUsd          float  NULL;   -- WakaTime's estimated USD cost of all AI models
GO

IF COL_LENGTH('dbo.E2M_Waka_Daily_Breakdown_T', 'aiAdditions') IS NULL
	ALTER TABLE dbo.E2M_Waka_Daily_Breakdown_T ADD    -- filled for project / editor / entity rows
		aiAdditions     int    NULL,
		aiDeletions     int    NULL,
		humanAdditions  int    NULL,
		humanDeletions  int    NULL,
		aiInputTokens   bigint NULL,
		aiOutputTokens  bigint NULL,
		aiCostUsd       float  NULL;
GO

IF COL_LENGTH('dbo.E2M_Waka_Durations_T', 'aiInputTokens') IS NULL
	ALTER TABLE dbo.E2M_Waka_Durations_T ADD
		aiInputTokens   bigint NULL,
		aiOutputTokens  bigint NULL,
		aiSessions      int    NULL,
		aiPromptEvents  int    NULL,
		aiCostUsd       float  NULL;
GO

IF COL_LENGTH('dbo.E2M_Waka_Heartbeats_T', 'aiSession') IS NULL
	ALTER TABLE dbo.E2M_Waka_Heartbeats_T ADD
		aiSession           nvarchar(100) NULL,
		aiInputTokens       int           NULL,
		aiOutputTokens      int           NULL,
		aiPromptLength      int           NULL,
		aiSubscriptionPlan  nvarchar(50)  NULL;
GO


/* ─── 8. AI model usage per developer per day ──────────────────────────────── */

IF OBJECT_ID('dbo.E2M_Waka_AI_Model_Daily_T', 'U') IS NULL
BEGIN
	CREATE TABLE dbo.E2M_Waka_AI_Model_Daily_T
	(
		id                 bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_E2M_Waka_AI_Model_Daily_T PRIMARY KEY,
		developerId        int           NOT NULL CONSTRAINT FK_WAM_Developer REFERENCES dbo.E2M_Developer_M (id),
		activityDate       date          NOT NULL,
		modelName          nvarchar(200) NOT NULL,
		lineChanges        int           NULL,          -- lines added or removed by this model
		inputTokens        bigint        NULL,
		outputTokens       bigint        NULL,
		cachedInputTokens  bigint        NULL,
		costUsd            float         NULL,
		syncedDate         datetime      NOT NULL CONSTRAINT DF_WAM_syncedDate DEFAULT (GETDATE())
	);
	CREATE INDEX IX_E2M_Waka_AI_Model_Daily_T_Dev ON dbo.E2M_Waka_AI_Model_Daily_T (developerId, activityDate);
END
GO


/* ─── 9. Editors / AI tools each developer uses (WakaTime user agents) ────── */

IF OBJECT_ID('dbo.E2M_Waka_User_Agent_T', 'U') IS NULL
BEGIN
	CREATE TABLE dbo.E2M_Waka_User_Agent_T
	(
		id                  int IDENTITY(1,1) NOT NULL CONSTRAINT PK_E2M_Waka_User_Agent_T PRIMARY KEY,
		developerId         int           NOT NULL CONSTRAINT FK_WUA_Developer REFERENCES dbo.E2M_Developer_M (id),
		agentId             nvarchar(64)  NOT NULL,     -- WakaTime user agent id
		agentValue          nvarchar(1000) NULL,        -- full user agent string
		editor              nvarchar(100) NULL,
		os                  nvarchar(100) NULL,
		agentVersion        nvarchar(100) NULL,
		aiModel             nvarchar(100) NULL,         -- AI model family detected by WakaTime
		aiModelVersion      nvarchar(100) NULL,
		aiModelComplexity   nvarchar(50)  NULL,
		isBrowserExtension  bit           NULL,
		isDesktopApp        bit           NULL,
		lastSeenUtc         datetime2(0)  NULL,
		createdUtc          datetime2(0)  NULL,
		syncedDate          datetime      NOT NULL CONSTRAINT DF_WUA_syncedDate DEFAULT (GETDATE()),
		CONSTRAINT UQ_E2M_Waka_User_Agent_T UNIQUE (developerId, agentId)
	);
END
GO


/* ─── 10. Sync runs — history + "only one run at a time" ──────────────────── */

IF OBJECT_ID('dbo.E2M_Waka_Sync_Run_T', 'U') IS NULL
BEGIN
	CREATE TABLE dbo.E2M_Waka_Sync_Run_T
	(
		runId           uniqueidentifier NOT NULL CONSTRAINT PK_E2M_Waka_Sync_Run_T PRIMARY KEY,
		triggeredBy     nvarchar(150)  NULL,
		developerId     int            NULL,              -- NULL = every active developer
		activityDates   nvarchar(400)  NULL,              -- '2026-10-17,2026-10-18'
		runStatus       varchar(20)    NOT NULL,          -- RUNNING / COMPLETED / FAILED
		developerCount  int            NULL,
		okCount         int            NULL,
		failedCount     int            NULL,
		errorMessage    nvarchar(2000) NULL,
		startedDate     datetime       NOT NULL CONSTRAINT DF_WSR_startedDate DEFAULT (GETDATE()),
		finishedDate    datetime       NULL,
		CONSTRAINT CK_E2M_Waka_Sync_Run_T_Status CHECK (runStatus IN ('RUNNING', 'COMPLETED', 'FAILED'))
	);
	CREATE INDEX IX_E2M_Waka_Sync_Run_T_Started ON dbo.E2M_Waka_Sync_Run_T (startedDate DESC);
END
GO


/* ─── 11. Projects per developer — repository + last activity ─────────────── */
/* Refreshed every few minutes (live job) and on every sync; lastHeartbeatUtc
   is what "working now" is based on. */

IF OBJECT_ID('dbo.E2M_Waka_Project_T', 'U') IS NULL
BEGIN
	CREATE TABLE dbo.E2M_Waka_Project_T
	(
		id                 int IDENTITY(1,1) NOT NULL CONSTRAINT PK_E2M_Waka_Project_T PRIMARY KEY,
		developerId        int            NOT NULL CONSTRAINT FK_WPR_Developer REFERENCES dbo.E2M_Developer_M (id),
		projectName        nvarchar(400)  NOT NULL,
		wakaProjectId      nvarchar(64)   NULL,
		repositoryUrl      nvarchar(500)  NULL,
		repositoryName     nvarchar(300)  NULL,
		repositoryProvider nvarchar(50)   NULL,          -- github / gitlab / bitbucket
		defaultBranch      nvarchar(200)  NULL,
		firstHeartbeatUtc  datetime2(0)   NULL,
		lastHeartbeatUtc   datetime2(0)   NULL,
		syncedDate         datetime       NOT NULL CONSTRAINT DF_WPR_syncedDate DEFAULT (GETDATE()),
		CONSTRAINT UQ_E2M_Waka_Project_T UNIQUE (developerId, projectName)
	);
	CREATE INDEX IX_E2M_Waka_Project_T_Last ON dbo.E2M_Waka_Project_T (lastHeartbeatUtc DESC);
END
GO


/* ─── 12. Commits — only for projects linked to a repository in WakaTime ──── */

IF OBJECT_ID('dbo.E2M_Waka_Commit_T', 'U') IS NULL
BEGIN
	CREATE TABLE dbo.E2M_Waka_Commit_T
	(
		id               bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_E2M_Waka_Commit_T PRIMARY KEY,
		developerId      int             NOT NULL CONSTRAINT FK_WCM_Developer REFERENCES dbo.E2M_Developer_M (id),
		projectName      nvarchar(400)   NOT NULL,
		commitHash       varchar(64)     NOT NULL,
		truncatedHash    varchar(16)     NULL,
		branch           nvarchar(400)   NULL,
		[message]        nvarchar(2000)  NULL,
		authorName       nvarchar(200)   NULL,
		authorEmail      nvarchar(200)   NULL,
		authorUsername   nvarchar(100)   NULL,
		authorDateUtc    datetime2(0)    NULL,
		totalSeconds     float           NULL,           -- coding time WakaTime attributes to the commit
		htmlUrl          nvarchar(500)   NULL,
		syncedDate       datetime        NOT NULL CONSTRAINT DF_WCM_syncedDate DEFAULT (GETDATE()),
		CONSTRAINT UQ_E2M_Waka_Commit_T UNIQUE (developerId, projectName, commitHash)
	);
	CREATE INDEX IX_E2M_Waka_Commit_T_Project ON dbo.E2M_Waka_Commit_T (projectName, authorDateUtc DESC);
END
GO


/* ─── 13. Teams ────────────────────────────────────────────────────────────── */

IF OBJECT_ID('dbo.E2M_Team_M', 'U') IS NULL
BEGIN
	CREATE TABLE dbo.E2M_Team_M
	(
		id           int IDENTITY(1,1) NOT NULL CONSTRAINT PK_E2M_Team_M PRIMARY KEY,
		teamName     nvarchar(100)  NOT NULL,
		description  nvarchar(500)  NULL,
		isActive     bit            NOT NULL CONSTRAINT DF_TEAM_isActive DEFAULT (1),
		createdBy    nvarchar(100)  NULL,
		createdDate  datetime       NOT NULL CONSTRAINT DF_TEAM_createdDate DEFAULT (GETDATE()),
		updatedBy    nvarchar(100)  NULL,
		updatedDate  datetime       NULL,
		isDeleted    bit            NOT NULL CONSTRAINT DF_TEAM_isDeleted DEFAULT (0),
		deletedBy    nvarchar(100)  NULL,
		deletedDate  datetime       NULL
	);
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_E2M_Team_M_Name')
	CREATE UNIQUE INDEX UX_E2M_Team_M_Name ON dbo.E2M_Team_M (teamName) WHERE isDeleted = 0;
GO

/* Members: userId = E2M_User.id (created by `npm run migrate`, so no FK here) */
IF OBJECT_ID('dbo.E2M_Team_User_T', 'U') IS NULL
BEGIN
	CREATE TABLE dbo.E2M_Team_User_T
	(
		id           int IDENTITY(1,1) NOT NULL CONSTRAINT PK_E2M_Team_User_T PRIMARY KEY,
		teamId       int            NOT NULL CONSTRAINT FK_TEAMUSER_Team REFERENCES dbo.E2M_Team_M (id),
		userId       int            NOT NULL,
		createdBy    nvarchar(100)  NULL,
		createdDate  datetime       NOT NULL CONSTRAINT DF_TEAMUSER_createdDate DEFAULT (GETDATE()),
		CONSTRAINT UQ_E2M_Team_User_T UNIQUE (teamId, userId)
	);
	CREATE INDEX IX_E2M_Team_User_T_User ON dbo.E2M_Team_User_T (userId);
END
GO
