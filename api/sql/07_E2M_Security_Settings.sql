/* =============================================================================
   DEVELOPER ACTIVITY — security settings
   -----------------------------------------------------------------------------
   E2M_Security_Setting_M   one row per setting key. Passwords are stored ONLY as a
                            bcrypt hash (made by the API) — never in plain text.

     tokenProtection        the password every admin must enter to set, replace or
                            remove a developer's WakaTime token. Changing it locks out
                            everyone who does not know the new one.
     developerSelfToken     '1' / '0' — developers may update their own token on
                            Profile › My WakaTime (confirmed with their login password)

   Procedures (called by the API, services/security-services)
     PRC_Get_Security_Setting      @pIN_settingKey
     PRC_Save_Security_Setting     @pIN_settingKey, @pIN_settingValue, @pIN_updatedBy
     PRC_Get_Super_Admin_Recipients  users with a Super Admin role (token change mails)

   Run after 06. Re-runnable.
============================================================================= */

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.E2M_Security_Setting_M', 'U') IS NULL
BEGIN
	CREATE TABLE dbo.E2M_Security_Setting_M
	(
		settingKey    varchar(50)    NOT NULL CONSTRAINT PK_E2M_Security_Setting_M PRIMARY KEY,
		settingValue  nvarchar(500)  NULL,              -- bcrypt hash for passwords, plain for flags
		updatedBy     nvarchar(100)  NULL,
		updatedDate   datetime       NOT NULL CONSTRAINT DF_SECSET_updatedDate DEFAULT (GETDATE())
	);
END
GO


CREATE OR ALTER PROCEDURE dbo.PRC_Get_Security_Setting
	@pIN_settingKey varchar(50)
AS
BEGIN
	SET NOCOUNT ON;

	SELECT settingKey, settingValue, ISNULL(updatedBy, '') AS updatedBy,
	       CONVERT(varchar(19), updatedDate, 126) AS updatedDate
	FROM dbo.E2M_Security_Setting_M
	WHERE settingKey = @pIN_settingKey;
END
GO


CREATE OR ALTER PROCEDURE dbo.PRC_Save_Security_Setting
	@pIN_settingKey   varchar(50),
	@pIN_settingValue nvarchar(500),
	@pIN_updatedBy    nvarchar(100) = NULL
AS
BEGIN
	SET NOCOUNT ON;

	MERGE dbo.E2M_Security_Setting_M AS T
	USING (SELECT @pIN_settingKey AS settingKey) AS S
	ON T.settingKey = S.settingKey
	WHEN MATCHED THEN UPDATE SET settingValue = @pIN_settingValue, updatedBy = @pIN_updatedBy, updatedDate = GETDATE()
	WHEN NOT MATCHED THEN INSERT (settingKey, settingValue, updatedBy, updatedDate)
		VALUES (@pIN_settingKey, @pIN_settingValue, @pIN_updatedBy, GETDATE());

	SELECT 'OK' AS resultCode;
END
GO


/* Users with a Super Admin role (role name Super_Admin / Super Admin / SuperAdmin) and an e-mail. */
CREATE OR ALTER PROCEDURE dbo.PRC_Get_Super_Admin_Recipients
AS
BEGIN
	SET NOCOUNT ON;

	SELECT DISTINCT U.id AS userId,
	       LTRIM(RTRIM(ISNULL(U.firstName, '') + N' ' + ISNULL(U.lastName, ''))) AS name,
	       LOWER(LTRIM(RTRIM(U.email))) AS email
	FROM dbo.E2M_User U
	JOIN dbo.E2M_UserRoleMapping UR ON UR.userId = U.id
	JOIN dbo.E2M_Role R ON R.id = UR.roleId AND R.isActive = 0
	WHERE U.isActive = 0                                   -- E2M_User: isActive 0 = active
	  AND U.email LIKE '%_@_%._%'
	  AND REPLACE(REPLACE(REPLACE(LOWER(R.role), '_', ''), ' ', ''), '-', '') = 'superadmin';
END
GO
