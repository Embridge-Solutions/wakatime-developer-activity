/* =============================================================================
   DEVELOPER ACTIVITY — mails (weekly reports, welcome mail)
   -----------------------------------------------------------------------------
   E2M_Mail_Setting_M   one row per mail type: on/off + options (JSON). NO secrets —
                        the SMTP server, user and password live only in the API .env.
   E2M_Mail_Log_T       one row per mail sent / failed / skipped (Settings › Mail History)

   Procedures (called by the API, services/mail-services/helpers/store.js)
     PRC_Get_Mail_Settings              all mail types
     PRC_Save_Mail_Setting              @pIN_mailType, @pIN_isEnabled, @pIN_settingsJson, @pIN_updatedBy
     PRC_Claim_Mail_Send                reserve one (mail, period, recipient) — ALREADY_SENT when it went out before
     PRC_Finish_Mail_Send               @pIN_logId, @pIN_mailStatus, @pIN_errorMessage
     PRC_Get_Mail_Logs                  @pIN_top, @pIN_mailType
     PRC_Get_Weekly_Developer_Recipients  tracked, active developers with an e-mail
     PRC_Get_Weekly_Team_Recipients       users who may see every developer (scope activity_viewall
                                          or a Super Admin role) — they get the whole-team report
     PRC_Get_User_Welcome_Info          @pIN_userId — login, e-mail, roles, tracked?, token status

   No duplicate mails: a weekly report is claimed per (mailType, periodKey, recipient)
   under a lock + a unique index; a second server or a second click gets ALREADY_SENT.

   Run after 01–05 (reads E2M_User / E2M_Role / E2M_Scopes from `npm run migrate`). Re-runnable.
============================================================================= */

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO


/* ─── 1. Settings ──────────────────────────────────────────────────────────── */

IF OBJECT_ID('dbo.E2M_Mail_Setting_M', 'U') IS NULL
BEGIN
	CREATE TABLE dbo.E2M_Mail_Setting_M
	(
		mailType      varchar(50)    NOT NULL CONSTRAINT PK_E2M_Mail_Setting_M PRIMARY KEY,   -- weeklyReport / welcome
		isEnabled     bit            NOT NULL CONSTRAINT DF_MAILSET_isEnabled DEFAULT (0),
		settingsJson  nvarchar(max)  NULL,              -- schedule, recipients, texts … (never passwords)
		updatedBy     nvarchar(100)  NULL,
		updatedDate   datetime       NOT NULL CONSTRAINT DF_MAILSET_updatedDate DEFAULT (GETDATE())
	);
END
GO


/* ─── 2. Log ───────────────────────────────────────────────────────────────── */

IF OBJECT_ID('dbo.E2M_Mail_Log_T', 'U') IS NULL
BEGIN
	CREATE TABLE dbo.E2M_Mail_Log_T
	(
		id              bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_E2M_Mail_Log_T PRIMARY KEY,
		mailType        varchar(50)    NOT NULL,          -- weeklyDeveloper / weeklyTeam / welcome / test
		periodKey       varchar(100)   NULL,              -- 'week:2026-10-12' — one mail per period per recipient
		recipientEmail  nvarchar(200)  NOT NULL,
		recipientName   nvarchar(150)  NULL,
		subject         nvarchar(500)  NULL,
		mailStatus      varchar(20)    NOT NULL,          -- SENDING / SENT / FAILED / SKIPPED
		errorMessage    nvarchar(2000) NULL,
		triggeredBy     nvarchar(150)  NULL,              -- scheduler / manual · username / user created · username
		createdDate     datetime       NOT NULL CONSTRAINT DF_MAILLOG_createdDate DEFAULT (GETDATE()),
		sentDate        datetime       NULL
	);
	CREATE INDEX IX_E2M_Mail_Log_T_Created ON dbo.E2M_Mail_Log_T (createdDate DESC);
END
GO
-- The duplicate guard: one SENDING / SENT row per mail, period and recipient
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_E2M_Mail_Log_T_Once')
	CREATE UNIQUE INDEX UX_E2M_Mail_Log_T_Once ON dbo.E2M_Mail_Log_T (mailType, periodKey, recipientEmail)
		WHERE periodKey IS NOT NULL AND mailStatus IN ('SENDING', 'SENT');
GO


/* ─── 3. Settings procedures ───────────────────────────────────────────────── */

CREATE OR ALTER PROCEDURE dbo.PRC_Get_Mail_Settings
AS
BEGIN
	SET NOCOUNT ON;

	SELECT mailType, isEnabled, settingsJson, ISNULL(updatedBy, '') AS updatedBy,
	       CONVERT(varchar(19), updatedDate, 126) AS updatedDate
	FROM dbo.E2M_Mail_Setting_M
	ORDER BY mailType;
END
GO


CREATE OR ALTER PROCEDURE dbo.PRC_Save_Mail_Setting
	@pIN_mailType     varchar(50),
	@pIN_isEnabled    bit,
	@pIN_settingsJson nvarchar(max),
	@pIN_updatedBy    nvarchar(100) = NULL
AS
BEGIN
	SET NOCOUNT ON;

	IF ISJSON(ISNULL(@pIN_settingsJson, '{}')) = 0
	BEGIN
		SELECT 'INVALID_JSON' AS resultCode;
		RETURN;
	END

	MERGE dbo.E2M_Mail_Setting_M AS T
	USING (SELECT @pIN_mailType AS mailType) AS S
	ON T.mailType = S.mailType
	WHEN MATCHED THEN UPDATE SET
		isEnabled = @pIN_isEnabled, settingsJson = @pIN_settingsJson, updatedBy = @pIN_updatedBy, updatedDate = GETDATE()
	WHEN NOT MATCHED THEN INSERT (mailType, isEnabled, settingsJson, updatedBy, updatedDate)
		VALUES (@pIN_mailType, @pIN_isEnabled, @pIN_settingsJson, @pIN_updatedBy, GETDATE());

	SELECT 'OK' AS resultCode;
END
GO


/* ─── 4. Sending — claim / finish / history ───────────────────────────────── */

/*
   Reserves one mail before it is sent.
     @pIN_periodKey NULL  → always OK (welcome / test mails are not limited)
     otherwise            → ALREADY_SENT when a SENDING / SENT row exists for the same
                            mail type + period + recipient (any server, any click)
   Answers resultCode OK / ALREADY_SENT and logId.
*/
CREATE OR ALTER PROCEDURE dbo.PRC_Claim_Mail_Send
	@pIN_mailType       varchar(50),
	@pIN_periodKey      varchar(100)  = NULL,
	@pIN_recipientEmail nvarchar(200),
	@pIN_recipientName  nvarchar(150) = NULL,
	@pIN_subject        nvarchar(500) = NULL,
	@pIN_triggeredBy    nvarchar(150) = NULL
AS
BEGIN
	SET NOCOUNT ON;
	SET XACT_ABORT ON;

	DECLARE @email nvarchar(200) = LOWER(LTRIM(RTRIM(@pIN_recipientEmail)));

	BEGIN TRANSACTION;
	DECLARE @lockResult int;
	EXEC @lockResult = sp_getapplock @Resource = 'E2M_Mail_Claim', @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = 10000;
	IF @lockResult < 0
		THROW 50020, 'Could not lock E2M_Mail_Claim — try again', 1;

	-- A SENDING row older than 30 minutes is a crashed send: let it be retried
	UPDATE dbo.E2M_Mail_Log_T
	SET mailStatus = 'FAILED', errorMessage = 'Send did not finish (server stopped?)'
	WHERE mailStatus = 'SENDING' AND createdDate < DATEADD(minute, -30, GETDATE());

	IF @pIN_periodKey IS NOT NULL AND EXISTS (
		SELECT 1 FROM dbo.E2M_Mail_Log_T
		WHERE mailType = @pIN_mailType AND periodKey = @pIN_periodKey AND recipientEmail = @email
		  AND mailStatus IN ('SENDING', 'SENT'))
	BEGIN
		COMMIT TRANSACTION;
		SELECT 'ALREADY_SENT' AS resultCode, CAST(NULL AS bigint) AS logId;
		RETURN;
	END

	INSERT INTO dbo.E2M_Mail_Log_T (mailType, periodKey, recipientEmail, recipientName, subject, mailStatus, triggeredBy, createdDate)
	VALUES (@pIN_mailType, @pIN_periodKey, @email, @pIN_recipientName, @pIN_subject, 'SENDING', @pIN_triggeredBy, GETDATE());

	DECLARE @logId bigint = SCOPE_IDENTITY();
	COMMIT TRANSACTION;
	SELECT 'OK' AS resultCode, @logId AS logId;
END
GO


CREATE OR ALTER PROCEDURE dbo.PRC_Finish_Mail_Send
	@pIN_logId        bigint,
	@pIN_mailStatus   varchar(20),            -- SENT / FAILED / SKIPPED
	@pIN_subject      nvarchar(500)  = NULL,
	@pIN_errorMessage nvarchar(2000) = NULL
AS
BEGIN
	SET NOCOUNT ON;

	UPDATE dbo.E2M_Mail_Log_T
	SET mailStatus   = @pIN_mailStatus,
	    subject      = ISNULL(@pIN_subject, subject),
	    errorMessage = @pIN_errorMessage,
	    sentDate     = CASE WHEN @pIN_mailStatus = 'SENT' THEN GETDATE() ELSE sentDate END
	WHERE id = @pIN_logId;
END
GO


CREATE OR ALTER PROCEDURE dbo.PRC_Get_Mail_Logs
	@pIN_top      int         = 200,
	@pIN_mailType varchar(50) = NULL
AS
BEGIN
	SET NOCOUNT ON;

	SELECT TOP (ISNULL(@pIN_top, 200))
	       id, mailType, ISNULL(periodKey, '') AS periodKey, recipientEmail, ISNULL(recipientName, '') AS recipientName,
	       ISNULL(subject, '') AS subject, mailStatus, ISNULL(errorMessage, '') AS errorMessage,
	       ISNULL(triggeredBy, '') AS triggeredBy,
	       CONVERT(varchar(19), createdDate, 126) AS createdDate,
	       CONVERT(varchar(19), sentDate, 126) AS sentDate
	FROM dbo.E2M_Mail_Log_T
	WHERE NULLIF(@pIN_mailType, '') IS NULL OR mailType = @pIN_mailType
	ORDER BY id DESC;
END
GO


/* ─── 5. Recipients ────────────────────────────────────────────────────────── */

/* Each tracked, active developer — their own weekly report. Login e-mail first, else the developer e-mail. */
CREATE OR ALTER PROCEDURE dbo.PRC_Get_Weekly_Developer_Recipients
AS
BEGIN
	SET NOCOUNT ON;

	SELECT D.id AS developerId,
	       D.developerName,
	       LOWER(COALESCE(NULLIF(LTRIM(RTRIM(U.email)), ''), D.email)) AS email,
	       D.userId,
	       dbo.FN_Get_User_Teams(D.userId) AS team
	FROM dbo.E2M_Developer_M D
	LEFT JOIN dbo.E2M_User U ON U.id = D.userId AND U.isActive = 0      -- E2M_User: isActive 0 = active
	WHERE D.isDeleted = 0 AND D.isActive = 1
	  AND COALESCE(NULLIF(LTRIM(RTRIM(U.email)), ''), D.email) LIKE '%_@_%._%'
	ORDER BY D.developerName;
END
GO


/* Users who may see every developer: scope activity_viewall, or a Super Admin role. */
CREATE OR ALTER PROCEDURE dbo.PRC_Get_Weekly_Team_Recipients
AS
BEGIN
	SET NOCOUNT ON;

	SELECT DISTINCT U.id AS userId,
	       LTRIM(RTRIM(ISNULL(U.firstName, '') + N' ' + ISNULL(U.lastName, ''))) AS name,
	       LOWER(LTRIM(RTRIM(U.email))) AS email
	FROM dbo.E2M_User U
	JOIN dbo.E2M_UserRoleMapping UR ON UR.userId = U.id
	JOIN dbo.E2M_Role R ON R.id = UR.roleId AND R.isActive = 0
	WHERE U.isActive = 0
	  AND U.email LIKE '%_@_%._%'
	  AND (   REPLACE(REPLACE(REPLACE(LOWER(R.role), '_', ''), ' ', ''), '-', '') = 'superadmin'
	       OR EXISTS (SELECT 1 FROM dbo.E2M_RoleScopeMapping RS
	                  JOIN dbo.E2M_Scopes S ON S.id = RS.scopeId AND S.isActive = 0
	                  WHERE RS.roleId = R.id AND S.scope = 'activity_viewall'));
END
GO


/* Everything the welcome mail needs about one user. */
CREATE OR ALTER PROCEDURE dbo.PRC_Get_User_Welcome_Info
	@pIN_userId int
AS
BEGIN
	SET NOCOUNT ON;

	SELECT TOP (1)
	       U.id AS userId,
	       U.username,
	       LTRIM(RTRIM(ISNULL(U.firstName, '') + N' ' + ISNULL(U.lastName, ''))) AS name,
	       LOWER(LTRIM(RTRIM(U.email))) AS email,
	       ISNULL(STUFF((SELECT N', ' + R.role FROM dbo.E2M_UserRoleMapping UR
	                     JOIN dbo.E2M_Role R ON R.id = UR.roleId AND R.isActive = 0
	                     WHERE UR.userId = U.id
	                     FOR XML PATH(''), TYPE).value('.', 'nvarchar(max)'), 1, 2, N''), N'') AS roles,
	       dbo.FN_Get_User_Teams(U.id) AS teams,
	       CAST(CASE WHEN D.id IS NOT NULL AND D.isActive = 1 THEN 1 ELSE 0 END AS bit) AS isTracked,
	       ISNULL(D.keyStatus, 'NOT_SET') AS keyStatus
	FROM dbo.E2M_User U
	LEFT JOIN dbo.E2M_Developer_M D ON D.userId = U.id AND D.isDeleted = 0
	WHERE U.id = @pIN_userId AND U.isActive = 0;
END
GO
