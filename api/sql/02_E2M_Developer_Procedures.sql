/* =============================================================================
   DEVELOPER ACTIVITY — developer master procedures
   (called by the API, services/developer-services/controller/developer.js)

     PRC_Get_Developer_List          @pIN_status, @pIN_search, @pIN_developerId
     PRC_Insert_Developer            named parameters
     PRC_Update_Developer            named parameters
     PRC_Update_Developer_Api_Key    @pIN_developerId, @pIN_apiKeyEnc …
     PRC_Update_Developer_Status     @pIN_developerId, @pIN_isActive, @pIN_updatedBy
     PRC_Delete_Developer            @pIN_developerId, @pIN_deletedBy
     PRC_Get_Developer_By_User       @pIN_userId — the developer linked to a login (own dashboard)

   FN_Get_User_Teams                 the team names of one user (function, used by 04)

   Users ↔ developers ↔ teams (called by user-services and team-services)
     PRC_Save_User_Developer         create / update / link the developer row of an app user
     PRC_Remove_User_Links           user deleted → developer soft-deleted (activity kept), team memberships removed
     PRC_Get_Team_List               teams with member names
     PRC_Save_Team                   insert / update a team (+ members when given)
     PRC_Delete_Team                 soft delete
     PRC_Save_User_Teams             replace one user's teams
     PRC_Get_User_Teams              team memberships (all users or one)

   E2M_User / E2M_Role / E2M_Scopes come from `npm run migrate`; procedures that read
   them compile before those tables exist (deferred name resolution).

   Insert / update procedures answer one row: resultCode
     OK / NOT_FOUND / EMAIL_EXISTS / CODE_EXISTS / WAKA_ACCOUNT_EXISTS
   The encrypted API key is never returned to the screen.

   Run after 01_E2M_WakaTime_Tables.sql. Re-runnable.
============================================================================= */

-- Filtered unique indexes need these ON, both when created and in every procedure that writes the tables
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO


/* "Frontend Developer, DB Data Analysis" — the teams of one app user (used by the dashboards). */
CREATE OR ALTER FUNCTION dbo.FN_Get_User_Teams (@userId int)
RETURNS nvarchar(1000)
AS
BEGIN
	RETURN ISNULL(STUFF((SELECT N', ' + T.teamName
	                     FROM dbo.E2M_Team_User_T TU
	                     JOIN dbo.E2M_Team_M T ON T.id = TU.teamId AND T.isDeleted = 0
	                     WHERE @userId IS NOT NULL AND TU.userId = @userId
	                     ORDER BY T.teamName
	                     FOR XML PATH(''), TYPE).value('.', 'nvarchar(max)'), 1, 2, N''), N'');
END
GO


/*
   EXEC PRC_Get_Developer_List                          -- everyone
   EXEC PRC_Get_Developer_List @pIN_status = 'ACTIVE', @pIN_search = N'ravi'
   EXEC PRC_Get_Developer_List @pIN_developerId = 3     -- one developer
*/
CREATE OR ALTER PROCEDURE dbo.PRC_Get_Developer_List
	@pIN_status      varchar(10)   = 'ALL',     -- ALL / ACTIVE / INACTIVE
	@pIN_search      nvarchar(150) = NULL,
	@pIN_developerId int           = NULL
AS
BEGIN
	SET NOCOUNT ON;

	DECLARE @search nvarchar(150) = NULLIF(LTRIM(RTRIM(@pIN_search)), '');
	DECLARE @status varchar(10)   = UPPER(ISNULL(NULLIF(@pIN_status, ''), 'ALL'));

	SELECT D.id                                                AS developerId,
	       ISNULL(D.developerCode, '')                         AS developerCode,
	       D.developerName,
	       D.email,
	       ISNULL(D.phone, '')                                 AS phone,
	       ISNULL(D.designation, '')                           AS designation,
	       ISNULL(D.team, '')                                  AS team,
	       D.userId,
	       CAST(CASE WHEN D.wakaApiKeyEnc IS NULL THEN 0 ELSE 1 END AS bit) AS hasApiKey,
	       ISNULL(D.apiKeyHint, '')                            AS apiKeyHint,
	       ISNULL(D.wakaUsername, '')                          AS wakaUsername,
	       ISNULL(D.wakaTimezone, '')                          AS wakaTimezone,
	       D.keyStatus,
	       CONVERT(varchar(19), D.keyVerifiedDate, 126)        AS keyVerifiedDate,
	       CONVERT(varchar(19), D.lastSyncDate, 126)           AS lastSyncDate,
	       ISNULL(D.lastSyncStatus, '')                        AS lastSyncStatus,
	       D.isActive,
	       ISNULL(STUFF((SELECT N', ' + T.teamName
	                     FROM dbo.E2M_Team_User_T TU
	                     JOIN dbo.E2M_Team_M T ON T.id = TU.teamId AND T.isDeleted = 0
	                     WHERE D.userId IS NOT NULL AND TU.userId = D.userId
	                     ORDER BY T.teamName
	                     FOR XML PATH(''), TYPE).value('.', 'nvarchar(max)'), 1, 2, N''), N'') AS teams,
	       ISNULL(D.createdBy, '')                             AS createdBy,
	       CONVERT(varchar(19), D.createdDate, 126)            AS createdDate,
	       ISNULL(D.updatedBy, D.createdBy)                    AS updatedBy,
	       CONVERT(varchar(19), ISNULL(D.updatedDate, D.createdDate), 126) AS updatedDate
	FROM dbo.E2M_Developer_M D
	WHERE D.isDeleted = 0
	  AND (@pIN_developerId IS NULL OR D.id = @pIN_developerId)
	  AND (@status = 'ALL'
	       OR (@status = 'ACTIVE'   AND D.isActive = 1)
	       OR (@status = 'INACTIVE' AND D.isActive = 0))
	  AND (@search IS NULL
	       OR D.developerName LIKE N'%' + @search + N'%'
	       OR D.email         LIKE N'%' + @search + N'%'
	       OR D.developerCode LIKE N'%' + @search + N'%'
	       OR D.wakaUsername  LIKE N'%' + @search + N'%'
	       OR D.team          LIKE N'%' + @search + N'%')
	ORDER BY D.isActive DESC, D.developerName;
END
GO


/*
   The API key is optional here — it can be added later from the API key screen.
   When given, the API has already verified it with WakaTime and encrypted it.
*/
CREATE OR ALTER PROCEDURE dbo.PRC_Insert_Developer
	@pIN_developerCode varchar(30)    = NULL,
	@pIN_developerName nvarchar(150),
	@pIN_email         nvarchar(200),
	@pIN_phone         varchar(20)    = NULL,
	@pIN_designation   nvarchar(100)  = NULL,
	@pIN_team          nvarchar(100)  = NULL,
	@pIN_userId        int            = NULL,
	@pIN_apiKeyEnc     nvarchar(1000) = NULL,
	@pIN_apiKeyHint    varchar(10)    = NULL,
	@pIN_wakaUserId    nvarchar(64)   = NULL,
	@pIN_wakaUsername  nvarchar(100)  = NULL,
	@pIN_wakaTimezone  varchar(64)    = NULL,
	@pIN_isActive      bit            = 1,
	@pIN_createdBy     nvarchar(100)  = NULL
AS
BEGIN
	SET NOCOUNT ON;

	DECLARE @email nvarchar(200) = LOWER(LTRIM(RTRIM(@pIN_email)));
	DECLARE @code  varchar(30)   = NULLIF(LTRIM(RTRIM(@pIN_developerCode)), '');

	IF EXISTS (SELECT 1 FROM dbo.E2M_Developer_M WHERE isDeleted = 0 AND email = @email)
	BEGIN
		SELECT 'EMAIL_EXISTS' AS resultCode, CAST(NULL AS int) AS developerId;
		RETURN;
	END
	IF @code IS NOT NULL AND EXISTS (SELECT 1 FROM dbo.E2M_Developer_M WHERE isDeleted = 0 AND developerCode = @code)
	BEGIN
		SELECT 'CODE_EXISTS' AS resultCode, CAST(NULL AS int) AS developerId;
		RETURN;
	END
	IF @pIN_wakaUserId IS NOT NULL AND EXISTS (SELECT 1 FROM dbo.E2M_Developer_M WHERE isDeleted = 0 AND wakaUserId = @pIN_wakaUserId)
	BEGIN
		SELECT 'WAKA_ACCOUNT_EXISTS' AS resultCode, CAST(NULL AS int) AS developerId;
		RETURN;
	END

	INSERT INTO dbo.E2M_Developer_M
		(developerCode, developerName, email, phone, designation, team, userId,
		 wakaApiKeyEnc, apiKeyHint, wakaUserId, wakaUsername, wakaTimezone, keyStatus, keyVerifiedDate,
		 isActive, createdBy, createdDate, isDeleted)
	VALUES
		(@code, LTRIM(RTRIM(@pIN_developerName)), @email, NULLIF(LTRIM(RTRIM(@pIN_phone)), ''),
		 NULLIF(LTRIM(RTRIM(@pIN_designation)), ''), NULLIF(LTRIM(RTRIM(@pIN_team)), ''), @pIN_userId,
		 @pIN_apiKeyEnc, @pIN_apiKeyHint, @pIN_wakaUserId, @pIN_wakaUsername, @pIN_wakaTimezone,
		 CASE WHEN @pIN_apiKeyEnc IS NULL THEN 'NOT_SET' ELSE 'VALID' END,
		 CASE WHEN @pIN_apiKeyEnc IS NULL THEN NULL ELSE GETDATE() END,
		 ISNULL(@pIN_isActive, 1), @pIN_createdBy, GETDATE(), 0);

	SELECT 'OK' AS resultCode, CAST(SCOPE_IDENTITY() AS int) AS developerId;
END
GO


/* Developer details only — the API key has its own procedure. */
CREATE OR ALTER PROCEDURE dbo.PRC_Update_Developer
	@pIN_developerId   int,
	@pIN_developerCode varchar(30)   = NULL,
	@pIN_developerName nvarchar(150),
	@pIN_email         nvarchar(200),
	@pIN_phone         varchar(20)   = NULL,
	@pIN_designation   nvarchar(100) = NULL,
	@pIN_team          nvarchar(100) = NULL,
	@pIN_userId        int           = NULL,
	@pIN_updatedBy     nvarchar(100) = NULL
AS
BEGIN
	SET NOCOUNT ON;

	DECLARE @email nvarchar(200) = LOWER(LTRIM(RTRIM(@pIN_email)));
	DECLARE @code  varchar(30)   = NULLIF(LTRIM(RTRIM(@pIN_developerCode)), '');

	IF NOT EXISTS (SELECT 1 FROM dbo.E2M_Developer_M WHERE isDeleted = 0 AND id = @pIN_developerId)
	BEGIN
		SELECT 'NOT_FOUND' AS resultCode;
		RETURN;
	END
	IF EXISTS (SELECT 1 FROM dbo.E2M_Developer_M WHERE isDeleted = 0 AND email = @email AND id <> @pIN_developerId)
	BEGIN
		SELECT 'EMAIL_EXISTS' AS resultCode;
		RETURN;
	END
	IF @code IS NOT NULL AND EXISTS (SELECT 1 FROM dbo.E2M_Developer_M WHERE isDeleted = 0 AND developerCode = @code AND id <> @pIN_developerId)
	BEGIN
		SELECT 'CODE_EXISTS' AS resultCode;
		RETURN;
	END

	UPDATE dbo.E2M_Developer_M
	SET developerCode = @code,
	    developerName = LTRIM(RTRIM(@pIN_developerName)),
	    email         = @email,
	    phone         = NULLIF(LTRIM(RTRIM(@pIN_phone)), ''),
	    designation   = NULLIF(LTRIM(RTRIM(@pIN_designation)), ''),
	    team          = NULLIF(LTRIM(RTRIM(@pIN_team)), ''),
	    userId        = @pIN_userId,
	    updatedBy     = @pIN_updatedBy,
	    updatedDate   = GETDATE()
	WHERE id = @pIN_developerId AND isDeleted = 0;

	SELECT 'OK' AS resultCode;
END
GO


/*
   Save a new (already verified + encrypted) API key, or remove it with
   @pIN_apiKeyEnc = NULL. A new key also clears an INVALID status.
*/
CREATE OR ALTER PROCEDURE dbo.PRC_Update_Developer_Api_Key
	@pIN_developerId  int,
	@pIN_apiKeyEnc    nvarchar(1000) = NULL,
	@pIN_apiKeyHint   varchar(10)    = NULL,
	@pIN_wakaUserId   nvarchar(64)   = NULL,
	@pIN_wakaUsername nvarchar(100)  = NULL,
	@pIN_wakaTimezone varchar(64)    = NULL,
	@pIN_updatedBy    nvarchar(100)  = NULL
AS
BEGIN
	SET NOCOUNT ON;

	IF NOT EXISTS (SELECT 1 FROM dbo.E2M_Developer_M WHERE isDeleted = 0 AND id = @pIN_developerId)
	BEGIN
		SELECT 'NOT_FOUND' AS resultCode;
		RETURN;
	END
	IF @pIN_wakaUserId IS NOT NULL AND EXISTS (SELECT 1 FROM dbo.E2M_Developer_M
	                                           WHERE isDeleted = 0 AND wakaUserId = @pIN_wakaUserId AND id <> @pIN_developerId)
	BEGIN
		SELECT 'WAKA_ACCOUNT_EXISTS' AS resultCode;
		RETURN;
	END

	UPDATE dbo.E2M_Developer_M
	SET wakaApiKeyEnc   = @pIN_apiKeyEnc,
	    apiKeyHint      = CASE WHEN @pIN_apiKeyEnc IS NULL THEN NULL ELSE @pIN_apiKeyHint END,
	    wakaUserId      = CASE WHEN @pIN_apiKeyEnc IS NULL THEN NULL ELSE @pIN_wakaUserId END,
	    wakaUsername    = CASE WHEN @pIN_apiKeyEnc IS NULL THEN NULL ELSE @pIN_wakaUsername END,
	    wakaTimezone    = CASE WHEN @pIN_apiKeyEnc IS NULL THEN NULL ELSE @pIN_wakaTimezone END,
	    keyStatus       = CASE WHEN @pIN_apiKeyEnc IS NULL THEN 'NOT_SET' ELSE 'VALID' END,
	    keyVerifiedDate = CASE WHEN @pIN_apiKeyEnc IS NULL THEN NULL ELSE GETDATE() END,
	    updatedBy       = @pIN_updatedBy,
	    updatedDate     = GETDATE()
	WHERE id = @pIN_developerId AND isDeleted = 0;

	SELECT 'OK' AS resultCode;
END
GO


/* Activate (1) / deactivate (0). Inactive developers are skipped by the sync. */
CREATE OR ALTER PROCEDURE dbo.PRC_Update_Developer_Status
	@pIN_developerId int,
	@pIN_isActive    bit,
	@pIN_updatedBy   nvarchar(100) = NULL
AS
BEGIN
	SET NOCOUNT ON;

	UPDATE dbo.E2M_Developer_M
	SET isActive    = @pIN_isActive,
	    updatedBy   = @pIN_updatedBy,
	    updatedDate = GETDATE()
	WHERE id = @pIN_developerId AND isDeleted = 0;

	SELECT CASE WHEN @@ROWCOUNT = 0 THEN 'NOT_FOUND' ELSE 'OK' END AS resultCode;
END
GO


/* Soft delete — collected activity rows are kept for reports. */
CREATE OR ALTER PROCEDURE dbo.PRC_Delete_Developer
	@pIN_developerId int,
	@pIN_deletedBy   nvarchar(100) = NULL
AS
BEGIN
	SET NOCOUNT ON;

	UPDATE dbo.E2M_Developer_M
	SET isDeleted   = 1,
	    isActive    = 0,
	    deletedBy   = @pIN_deletedBy,
	    deletedDate = GETDATE()
	WHERE id = @pIN_developerId AND isDeleted = 0;

	SELECT CASE WHEN @@ROWCOUNT = 0 THEN 'NOT_FOUND' ELSE 'OK' END AS resultCode;
END
GO


/* The developer row linked to an app login (E2M_User.id) — non-admins only see their own activity. */
CREATE OR ALTER PROCEDURE dbo.PRC_Get_Developer_By_User
	@pIN_userId int
AS
BEGIN
	SET NOCOUNT ON;

	SELECT TOP (1) D.id AS developerId, D.developerName, ISNULL(D.team, '') AS team
	FROM dbo.E2M_Developer_M D
	WHERE D.isDeleted = 0 AND D.userId = @pIN_userId
	ORDER BY D.id;
END
GO


/* ═══ Users ↔ developers ════════════════════════════════════════════════════ */

/*
   The developer (WakaTime) side of an app user. One call from user create / edit:
     · developer already linked to the user      → updated
     · a developer with the same e-mail, unlinked → linked to the user and updated
     · otherwise                                  → created (only when @pIN_isActive = 1)
   @pIN_isActive = 0 stops collection; the developer and its data stay.
   Answers resultCode OK / EMAIL_EXISTS / CODE_EXISTS and developerId (NULL when nothing to track).
*/
CREATE OR ALTER PROCEDURE dbo.PRC_Save_User_Developer
	@pIN_userId        int,
	@pIN_developerName nvarchar(150),
	@pIN_email         nvarchar(200),
	@pIN_developerCode varchar(30)   = NULL,
	@pIN_designation   nvarchar(100) = NULL,
	@pIN_phone         varchar(20)   = NULL,
	@pIN_isActive      bit           = 1,
	@pIN_savedBy       nvarchar(100) = NULL
AS
BEGIN
	SET NOCOUNT ON;

	DECLARE @email nvarchar(200) = LOWER(LTRIM(RTRIM(@pIN_email)));
	DECLARE @code  varchar(30)   = NULLIF(LTRIM(RTRIM(@pIN_developerCode)), '');
	DECLARE @devId int =
		(SELECT TOP (1) id FROM dbo.E2M_Developer_M WHERE isDeleted = 0 AND userId = @pIN_userId ORDER BY id);

	IF @devId IS NULL
		SET @devId = (SELECT TOP (1) id FROM dbo.E2M_Developer_M
		              WHERE isDeleted = 0 AND userId IS NULL AND email = @email ORDER BY id);

	IF @devId IS NULL AND ISNULL(@pIN_isActive, 1) = 0
	BEGIN
		SELECT 'OK' AS resultCode, CAST(NULL AS int) AS developerId;   -- not tracked, nothing to create
		RETURN;
	END

	IF EXISTS (SELECT 1 FROM dbo.E2M_Developer_M WHERE isDeleted = 0 AND email = @email AND id <> ISNULL(@devId, 0))
	BEGIN
		SELECT 'EMAIL_EXISTS' AS resultCode, CAST(NULL AS int) AS developerId;
		RETURN;
	END
	IF @code IS NOT NULL AND EXISTS (SELECT 1 FROM dbo.E2M_Developer_M WHERE isDeleted = 0 AND developerCode = @code AND id <> ISNULL(@devId, 0))
	BEGIN
		SELECT 'CODE_EXISTS' AS resultCode, CAST(NULL AS int) AS developerId;
		RETURN;
	END

	IF @devId IS NULL
	BEGIN
		INSERT INTO dbo.E2M_Developer_M
			(developerCode, developerName, email, phone, designation, userId, keyStatus, isActive, createdBy, createdDate, isDeleted)
		VALUES
			(@code, LTRIM(RTRIM(@pIN_developerName)), @email, NULLIF(LTRIM(RTRIM(@pIN_phone)), ''),
			 NULLIF(LTRIM(RTRIM(@pIN_designation)), ''), @pIN_userId, 'NOT_SET', 1, @pIN_savedBy, GETDATE(), 0);
		SET @devId = CAST(SCOPE_IDENTITY() AS int);
	END
	ELSE
		UPDATE dbo.E2M_Developer_M
		SET userId        = @pIN_userId,
		    developerName = LTRIM(RTRIM(@pIN_developerName)),
		    email         = @email,
		    developerCode = @code,
		    designation   = NULLIF(LTRIM(RTRIM(@pIN_designation)), ''),
		    phone         = NULLIF(LTRIM(RTRIM(@pIN_phone)), ''),
		    isActive      = ISNULL(@pIN_isActive, 1),
		    updatedBy     = @pIN_savedBy,
		    updatedDate   = GETDATE()
		WHERE id = @devId;

	SELECT 'OK' AS resultCode, @devId AS developerId;
END
GO


/* User deleted: stop collecting (developer soft-deleted, activity kept) and leave every team. */
CREATE OR ALTER PROCEDURE dbo.PRC_Remove_User_Links
	@pIN_userId    int,
	@pIN_deletedBy nvarchar(100) = NULL
AS
BEGIN
	SET NOCOUNT ON;

	UPDATE dbo.E2M_Developer_M
	SET isDeleted = 1, isActive = 0, deletedBy = @pIN_deletedBy, deletedDate = GETDATE()
	WHERE userId = @pIN_userId AND isDeleted = 0;

	DELETE FROM dbo.E2M_Team_User_T WHERE userId = @pIN_userId;

	SELECT 'OK' AS resultCode;
END
GO


/* ═══ Teams ═════════════════════════════════════════════════════════════════ */

CREATE OR ALTER PROCEDURE dbo.PRC_Get_Team_List
	@pIN_activeOnly bit = 0
AS
BEGIN
	SET NOCOUNT ON;

	SELECT T.id                                                    AS teamId,
	       T.teamName,
	       ISNULL(T.description, '')                               AS description,
	       T.isActive,
	       (SELECT COUNT(1) FROM dbo.E2M_Team_User_T TU
	          JOIN dbo.E2M_User U ON U.id = TU.userId AND U.isActive = 0   -- E2M_User: isActive 0 = active
	         WHERE TU.teamId = T.id)                               AS memberCount,
	       ISNULL(STUFF((SELECT N',' + CAST(TU.userId AS nvarchar(20))
	                     FROM dbo.E2M_Team_User_T TU
	                     JOIN dbo.E2M_User U ON U.id = TU.userId AND U.isActive = 0
	                     WHERE TU.teamId = T.id ORDER BY TU.userId
	                     FOR XML PATH(''), TYPE).value('.', 'nvarchar(max)'), 1, 1, N''), N'') AS memberIds,
	       ISNULL(STUFF((SELECT N', ' + LTRIM(RTRIM(ISNULL(U.firstName, '') + N' ' + ISNULL(U.lastName, '')))
	                     FROM dbo.E2M_Team_User_T TU
	                     JOIN dbo.E2M_User U ON U.id = TU.userId AND U.isActive = 0
	                     WHERE TU.teamId = T.id ORDER BY U.firstName
	                     FOR XML PATH(''), TYPE).value('.', 'nvarchar(max)'), 1, 2, N''), N'') AS memberNames,
	       ISNULL(T.createdBy, '')                                 AS createdBy,
	       CONVERT(varchar(19), ISNULL(T.updatedDate, T.createdDate), 126) AS updatedDate
	FROM dbo.E2M_Team_M T
	WHERE T.isDeleted = 0
	  AND (ISNULL(@pIN_activeOnly, 0) = 0 OR T.isActive = 1)
	ORDER BY T.teamName;
END
GO


/*
   Insert (@pIN_teamId NULL) or update a team. @pIN_memberIdsJson = '[3,7,9]' replaces
   the members; NULL leaves them as they are.
   Answers resultCode OK / NAME_EXISTS / NOT_FOUND and teamId.
*/
CREATE OR ALTER PROCEDURE dbo.PRC_Save_Team
	@pIN_teamId        int           = NULL,
	@pIN_teamName      nvarchar(100),
	@pIN_description   nvarchar(500) = NULL,
	@pIN_isActive      bit           = 1,
	@pIN_memberIdsJson nvarchar(max) = NULL,
	@pIN_savedBy       nvarchar(100) = NULL
AS
BEGIN
	SET NOCOUNT ON;
	SET XACT_ABORT ON;

	DECLARE @name nvarchar(100) = LTRIM(RTRIM(@pIN_teamName));
	DECLARE @teamId int = @pIN_teamId;

	IF @teamId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.E2M_Team_M WHERE id = @teamId AND isDeleted = 0)
	BEGIN
		SELECT 'NOT_FOUND' AS resultCode, CAST(NULL AS int) AS teamId;
		RETURN;
	END
	IF EXISTS (SELECT 1 FROM dbo.E2M_Team_M WHERE isDeleted = 0 AND teamName = @name AND id <> ISNULL(@teamId, 0))
	BEGIN
		SELECT 'NAME_EXISTS' AS resultCode, CAST(NULL AS int) AS teamId;
		RETURN;
	END

	BEGIN TRANSACTION;

	IF @teamId IS NULL
	BEGIN
		INSERT INTO dbo.E2M_Team_M (teamName, description, isActive, createdBy, createdDate, isDeleted)
		VALUES (@name, NULLIF(LTRIM(RTRIM(@pIN_description)), ''), ISNULL(@pIN_isActive, 1), @pIN_savedBy, GETDATE(), 0);
		SET @teamId = CAST(SCOPE_IDENTITY() AS int);
	END
	ELSE
		UPDATE dbo.E2M_Team_M
		SET teamName = @name, description = NULLIF(LTRIM(RTRIM(@pIN_description)), ''),
		    isActive = ISNULL(@pIN_isActive, 1), updatedBy = @pIN_savedBy, updatedDate = GETDATE()
		WHERE id = @teamId;

	IF @pIN_memberIdsJson IS NOT NULL
	BEGIN
		DELETE FROM dbo.E2M_Team_User_T
		WHERE teamId = @teamId
		  AND userId NOT IN (SELECT CAST([value] AS int) FROM OPENJSON(@pIN_memberIdsJson));

		-- only existing, not deleted users (E2M_User.isActive = 0 means active)
		INSERT INTO dbo.E2M_Team_User_T (teamId, userId, createdBy, createdDate)
		SELECT DISTINCT @teamId, U.id, @pIN_savedBy, GETDATE()
		FROM OPENJSON(@pIN_memberIdsJson) J
		JOIN dbo.E2M_User U ON U.id = CAST(J.[value] AS int) AND U.isActive = 0
		WHERE NOT EXISTS (SELECT 1 FROM dbo.E2M_Team_User_T X WHERE X.teamId = @teamId AND X.userId = U.id);
	END

	COMMIT TRANSACTION;
	SELECT 'OK' AS resultCode, @teamId AS teamId;
END
GO


CREATE OR ALTER PROCEDURE dbo.PRC_Delete_Team
	@pIN_teamId    int,
	@pIN_deletedBy nvarchar(100) = NULL
AS
BEGIN
	SET NOCOUNT ON;

	UPDATE dbo.E2M_Team_M
	SET isDeleted = 1, isActive = 0, deletedBy = @pIN_deletedBy, deletedDate = GETDATE()
	WHERE id = @pIN_teamId AND isDeleted = 0;

	IF @@ROWCOUNT = 0
	BEGIN
		SELECT 'NOT_FOUND' AS resultCode;
		RETURN;
	END

	DELETE FROM dbo.E2M_Team_User_T WHERE teamId = @pIN_teamId;
	SELECT 'OK' AS resultCode;
END
GO


/* Replace one user's teams: @pIN_teamIdsJson = '[1,4]' ('[]' = no team). */
CREATE OR ALTER PROCEDURE dbo.PRC_Save_User_Teams
	@pIN_userId      int,
	@pIN_teamIdsJson nvarchar(max),
	@pIN_savedBy     nvarchar(100) = NULL
AS
BEGIN
	SET NOCOUNT ON;
	SET XACT_ABORT ON;

	BEGIN TRANSACTION;

	DELETE FROM dbo.E2M_Team_User_T
	WHERE userId = @pIN_userId
	  AND teamId NOT IN (SELECT CAST([value] AS int) FROM OPENJSON(ISNULL(@pIN_teamIdsJson, '[]')));

	INSERT INTO dbo.E2M_Team_User_T (teamId, userId, createdBy, createdDate)
	SELECT DISTINCT T.id, @pIN_userId, @pIN_savedBy, GETDATE()
	FROM OPENJSON(ISNULL(@pIN_teamIdsJson, '[]')) J
	JOIN dbo.E2M_Team_M T ON T.id = CAST(J.[value] AS int) AND T.isDeleted = 0
	WHERE NOT EXISTS (SELECT 1 FROM dbo.E2M_Team_User_T X WHERE X.teamId = T.id AND X.userId = @pIN_userId);

	COMMIT TRANSACTION;
	SELECT 'OK' AS resultCode;
END
GO


CREATE OR ALTER PROCEDURE dbo.PRC_Get_User_Teams
	@pIN_userId int = NULL
AS
BEGIN
	SET NOCOUNT ON;

	SELECT TU.userId, T.id AS teamId, T.teamName
	FROM dbo.E2M_Team_User_T TU
	JOIN dbo.E2M_Team_M T ON T.id = TU.teamId AND T.isDeleted = 0
	WHERE @pIN_userId IS NULL OR TU.userId = @pIN_userId
	ORDER BY TU.userId, T.teamName;
END
GO
