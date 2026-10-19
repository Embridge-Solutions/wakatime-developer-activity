/* =============================================================================
   DEVELOPER ACTIVITY — access scopes and default roles
   -----------------------------------------------------------------------------
   Run AFTER `npm run migrate` (it creates E2M_Scopes, E2M_Role, E2M_RoleScopeMapping)
   and after 01–04. Re-runnable: adds what is missing, never deletes or renames.

   Scopes are "<page>_<action>". The screens and the API check them:

     mydashboard_view        My Dashboard — own activity
     teamdashboard_view      Team Dashboard
     projectdashboard_view   Projects + project detail (branches, commits, working now)
     aiinsights_view         AI Insights
     report_view             Reports
     report_export           Export reports (Excel / CSV / PDF)
     activity_viewall        See EVERY developer's data. Without it a user sees only
                             the developer linked to their own login.
     user_view|create|update|delete      Users (incl. WakaTime tracking + teams of a user)
     role_view|create|update|delete      Roles & scopes
     team_view|create|update|delete      Teams
     token_view|update                   WakaTime tokens
     sync_view|run                       Data Sync (history / run now)
     appearance_update                   Organisation theme & logo
     settings_view|update                Settings: mail server status, weekly report & welcome mail

   Default roles (created when missing; existing roles keep their other scopes):
     Super_Admin  every scope (also always full access in the API, by role name)
     Admin        everything except creating / changing / deleting roles
     Developer    own dashboard + reports only
   The support role E2M_Developer (from the seeders) gets every scope.

   E2M_Scopes / E2M_Role: isActive = 0 means ACTIVE (same convention as E2M_User).
============================================================================= */

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.E2M_Scopes', 'U') IS NULL OR OBJECT_ID('dbo.E2M_Role', 'U') IS NULL
	OR OBJECT_ID('dbo.E2M_RoleScopeMapping', 'U') IS NULL
	THROW 50010, 'Run `npm run migrate` first — E2M_Scopes / E2M_Role / E2M_RoleScopeMapping are missing.', 1;
GO


/* ─── 1. Scopes ────────────────────────────────────────────────────────────── */

DECLARE @scopes TABLE (scope nvarchar(100) PRIMARY KEY, description nvarchar(150));
INSERT INTO @scopes (scope, description) VALUES
	(N'mydashboard_view',      N'My Dashboard — own coding activity'),
	(N'teamdashboard_view',    N'Team Dashboard'),
	(N'projectdashboard_view', N'Projects and project detail dashboards'),
	(N'aiinsights_view',       N'AI Insights'),
	(N'report_view',           N'View reports'),
	(N'report_export',         N'Export reports to Excel / CSV / PDF'),
	(N'activity_viewall',      N'See every developer''s data (otherwise only your own)'),
	(N'user_view',             N'View the User list'),
	(N'user_create',           N'Create new users'),
	(N'user_update',           N'Update the User Details'),
	(N'user_delete',           N'Delete the user'),
	(N'role_view',             N'View roles and scopes'),
	(N'role_create',           N'Create roles'),
	(N'role_update',           N'Update roles and their scopes'),
	(N'role_delete',           N'Delete roles'),
	(N'team_view',             N'View teams'),
	(N'team_create',           N'Create teams'),
	(N'team_update',           N'Update teams and members'),
	(N'team_delete',           N'Delete teams'),
	(N'token_view',            N'View WakaTime token status'),
	(N'token_update',          N'Set, test and remove WakaTime tokens'),
	(N'sync_view',             N'View data sync history'),
	(N'sync_run',              N'Run the WakaTime data sync now'),
	(N'appearance_update',     N'Change the organisation theme and logo'),
	(N'settings_view',         N'View settings (mail server status, mail history)'),
	(N'settings_update',       N'Change mail settings, send test / report mails');

INSERT INTO dbo.E2M_Scopes (scope, description, isActive, createdAt, updatedAt)
SELECT S.scope, S.description, 0, GETDATE(), GETDATE()
FROM @scopes S
WHERE NOT EXISTS (SELECT 1 FROM dbo.E2M_Scopes X WHERE X.scope = S.scope);

-- Re-activate any of these scopes that were switched off
UPDATE X SET isActive = 0, updatedAt = GETDATE()
FROM dbo.E2M_Scopes X JOIN @scopes S ON S.scope = X.scope
WHERE X.isActive <> 0;

SELECT COUNT(1) AS developerActivityScopes FROM dbo.E2M_Scopes X JOIN @scopes S ON S.scope = X.scope;
GO


/* ─── 2. Roles ─────────────────────────────────────────────────────────────── */

INSERT INTO dbo.E2M_Role (role, description, isActive, createdAt, updatedAt)
SELECT R.role, R.description, 0, GETDATE(), GETDATE()
FROM (VALUES
	(N'Super_Admin', N'Full access to every screen and every developer'),
	(N'Admin',       N'All dashboards, users, teams, tokens and data sync for every developer'),
	(N'Developer',   N'Own dashboard and reports only')
) R (role, description)
WHERE NOT EXISTS (SELECT 1 FROM dbo.E2M_Role X WHERE X.role = R.role AND X.isActive = 0);
GO


/* ─── 3. Role ↔ scope mapping (adds missing pairs only) ────────────────────── */

DECLARE @map TABLE (role nvarchar(100), scope nvarchar(100));

-- Super_Admin and the support role: everything
INSERT INTO @map (role, scope)
SELECT R.role, S.scope
FROM (VALUES (N'Super_Admin'), (N'E2M_Developer')) R (role)
CROSS JOIN (SELECT scope FROM dbo.E2M_Scopes WHERE scope IN (
	N'mydashboard_view', N'teamdashboard_view', N'projectdashboard_view', N'aiinsights_view', N'report_view', N'report_export',
	N'activity_viewall', N'user_view', N'user_create', N'user_update', N'user_delete',
	N'role_view', N'role_create', N'role_update', N'role_delete',
	N'team_view', N'team_create', N'team_update', N'team_delete',
	N'token_view', N'token_update', N'sync_view', N'sync_run', N'appearance_update',
	N'settings_view', N'settings_update')) S;

-- Admin: everything except managing roles
INSERT INTO @map (role, scope)
SELECT N'Admin', scope FROM (VALUES
	(N'mydashboard_view'), (N'teamdashboard_view'), (N'projectdashboard_view'), (N'aiinsights_view'),
	(N'report_view'), (N'report_export'), (N'activity_viewall'),
	(N'user_view'), (N'user_create'), (N'user_update'), (N'user_delete'), (N'role_view'),
	(N'team_view'), (N'team_create'), (N'team_update'), (N'team_delete'),
	(N'token_view'), (N'token_update'), (N'sync_view'), (N'sync_run'), (N'appearance_update'),
	(N'settings_view'), (N'settings_update')
) V (scope);

-- Developer: own data only
INSERT INTO @map (role, scope)
SELECT N'Developer', scope FROM (VALUES (N'mydashboard_view'), (N'report_view'), (N'report_export')) V (scope);

INSERT INTO dbo.E2M_RoleScopeMapping (roleId, scopeId, createdAt, updatedAt)
SELECT DISTINCT R.id, S.id, GETDATE(), GETDATE()
FROM @map M
JOIN dbo.E2M_Role   R ON R.role  = M.role  AND R.isActive = 0
JOIN dbo.E2M_Scopes S ON S.scope = M.scope AND S.isActive = 0
WHERE NOT EXISTS (SELECT 1 FROM dbo.E2M_RoleScopeMapping X WHERE X.roleId = R.id AND X.scopeId = S.id);

SELECT R.role, COUNT(X.scopeId) AS scopeCount
FROM dbo.E2M_Role R
LEFT JOIN dbo.E2M_RoleScopeMapping X ON X.roleId = R.id
WHERE R.isActive = 0
GROUP BY R.role
ORDER BY R.role;
GO
