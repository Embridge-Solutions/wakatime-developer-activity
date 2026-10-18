const { ACCESS_DENIED } = require('../../data/statusMessage');

/**
 * ─── Scope-based access ─────────────────────────────────────────────────────
 * Scopes come from the login token (req.token.scopes, e.g. 'user_create').
 * Roles get their scopes on the Roles screen; sql/05_E2M_Access_Scopes_Roles.sql
 * adds the standard ones. A role named Super_Admin / Super Admin always has
 * full access, so it can never lock itself out.
 *
 *   router.post('/addUser', [auth, requireScope('user_create')], …)
 *   router.get('/getTeams', [auth, requireScope('team_view', 'user_view')], …)   // any of
 */

const isSuperAdmin = (req) => (req.token?.role || []).some((role) => /super[\s_-]*admin/i.test(String(role)));

const hasScope = (req, scope) => isSuperAdmin(req) || (req.token?.scopes || []).includes(scope);

/** Every developer's data (activity_viewall); without it only the developer linked to the login. */
const canViewAll = (req) => hasScope(req, 'activity_viewall');

/** Middleware (after auth): allow when the user has ANY of the scopes. */
const requireScope =
  (...scopes) =>
  (req, res, next) => {
    if (scopes.some((s) => hasScope(req, s))) return next();
    return res.status(ACCESS_DENIED.code).json({ success: false, msg: ACCESS_DENIED.message });
  };

/** Own record (`:id` = the logged-in user) or the given scope. */
const selfOrScope =
  (...scopes) =>
  (req, res, next) => {
    if (Number(req.params.id) === Number(req.user?.id)) return next();
    return requireScope(...scopes)(req, res, next);
  };

module.exports = { isSuperAdmin, hasScope, canViewAll, requireScope, selfOrScope };
