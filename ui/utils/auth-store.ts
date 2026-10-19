"use client";

import { APP_CONFIG } from "@/config/config";

// types
export interface StoredUser {
  id: number | null;
  username: string | null | undefined;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  roles?: string[];
  scopes?: string[];
}

export interface ScopeAccess {
  // value: number;
  scope: string; // e.g. 'read', 'write', 'delete', 'update'
}
export interface PageAccess {
  page: string; // e.g. 'dashboard', 'user', 'role', 'supplier'
  access: ScopeAccess[];
}

// ═══════════════════════════════════════════════════════════════════════
// USER DATA
// ═══════════════════════════════════════════════════════════════════════

/**
 * Get stored user details directly from the userDetails object
 */
export function getUserData(): StoredUser | null {
  try {
    const data = localStorage.getItem(APP_CONFIG.USER_DETAILS_KEY);
    return data ? JSON.parse(atob(data)) : null;
  } catch {
    return null;
  }
}

/** Super Admin role (same rule as the API): full access regardless of scopes. */
export function isSuperAdmin(): boolean {
  const roles = getUserData()?.roles ?? [];
  const list = Array.isArray(roles) ? roles : [roles];
  return list.some((role) => /super[\s_-]*admin/i.test(String(role)));
}

/** Has the exact scope, e.g. hasScope('user_create'). */
export function hasScope(scope: string): boolean {
  if (isSuperAdmin()) return true;
  const scopes = getUserData()?.scopes ?? [];
  return scopes.map((s) => String(s).toLowerCase()).includes(scope.toLowerCase());
}

/** activity_viewall — every developer's data; without it only your own. */
export function canViewAll(): boolean {
  return hasScope('activity_viewall');
}

/** @deprecated name kept for the Appearance page — organisation theme needs appearance_update. */
export function isAdminUser(): boolean {
  return hasScope('appearance_update');
}

/** First screen after login, by what the user may open. */
export function landingPath(): string {
  if (hasPageAccess('teamdashboard')) return '/dashboard';
  if (hasPageAccess('mydashboard')) return '/developer-dashboard';
  if (hasPageAccess('projectdashboard')) return '/projects';
  if (hasPageAccess('report')) return '/daily-report';
  return '/personal-information';
}

/**
 * Get all stored page access permissions parsed from userDetails
 */
export function getUserScopes(): PageAccess[] {
  const userData = getUserData();
  if (!userData || !userData.scopes || !Array.isArray(userData.scopes))
    return [];

  // Transform raw scopes from userDetails into page-based access structure on the fly
  const pageAccessMap: Record<string, PageAccess> = {};
  for (const item of userData.scopes) {
    const scopeStr: string = (item as any) || "";
    const lastUnderscoreIdx = scopeStr.lastIndexOf("_");
    if (lastUnderscoreIdx === -1) continue;
    const page = scopeStr.substring(0, lastUnderscoreIdx).toLowerCase();
    const action = scopeStr.substring(lastUnderscoreIdx + 1).toLowerCase();

    if (!pageAccessMap[page]) {
      pageAccessMap[page] = { page, access: [] };
    }
    pageAccessMap[page].access.push({
      scope: action,
    });
  }
  return Object.values(pageAccessMap);
}

/**
 * Check if user session exists in storage
 */
export function hasUserSession(): boolean {
  return getUserData() !== null && getUserData()?.id !== undefined;
}

// ═══════════════════════════════════════════════════════════════════════
// SCOPES / ACCESS CONTROL
// ═══════════════════════════════════════════════════════════════════════

/**
 * Check if user has access to a specific page
 * @param pageName - The page identifier (e.g. 'dashboard', 'user', 'role')
 * @returns true if the user has ANY access to this page
 */
export function hasPageAccess(pageName: string): boolean {
  if (isSuperAdmin()) return true;
  const scopes = getUserScopes();
  const normalizedPage = pageName.toLowerCase().replace(/^\//, "");
  const pageScope = scopes.find(
    (s) =>
      String(s.page).toLowerCase() === String(normalizedPage).toLowerCase(),
  );

  return !!pageScope?.access?.some(
    (item: any) => String(item.scope).toLowerCase() === "view",
  );
}
/**
 * Check if user has a specific action on a page
 * @param pageName - The page identifier
 * @param action - The action (e.g. 'read', 'write', 'delete')
 * @returns true if user has the specified action access
 */
export function hasActionAccess(pageName: string, action: string): boolean {
  if (isSuperAdmin()) return true;
  const scopes = getUserScopes();
  const normalizedPage = pageName.toLowerCase().replace(/^\//, "");
  const pageScope = scopes.find((s) => s.page === normalizedPage);
  if (!pageScope) return false;
  return pageScope.access.some(
    (a) => a.scope.toLowerCase() === action.toLowerCase(),
  );
}
/**
 * Get all actions available for a page
 */
export function getPageActions(pageName: string): string[] {
  const scopes = getUserScopes();
  const normalizedPage = pageName.toLowerCase().replace(/^\//, "");
  const pageScope = scopes.find(
    (s) =>
      String(s.page).toLowerCase() === String(normalizedPage).toLowerCase(),
  );
  if (!pageScope) return [];
  return pageScope.access.map((a) => a.scope);
}
// ═══════════════════════════════════════════════════════════════════════
// ROUTE ↔ PAGE MAPPING
// ═══════════════════════════════════════════════════════════════════════
/**
 * Map a URL pathname to a scope page name.
 * Routes like /supplier, /user, /role map to scope page names.
 * This is the SINGLE place to add new route-to-scope mappings.
 */
const ROUTE_TO_SCOPE_MAP: Record<string, string> = {
  "/dashboard": "teamdashboard",
  "/developer-dashboard": "mydashboard",
  "/projects": "projectdashboard",
  "/ai-insights": "aiinsights",
  "/daily-report": "report",
  "/developer-report": "report",
  "/project-report": "report",
  "/tools-report": "report",
  "/ai-report": "report",
  "/user": "user",
  "/user-creation": "user",
  "/teams": "team",
  "/role": "role",
  "/wakatime-tokens": "token",
  "/data-sync": "sync",
  "/mail-server": "settings",
  "/weekly-report": "settings",
  "/welcome-mail": "settings",
  "/mail-history": "settings",
  "/data-collection": "settings",
  "/security-settings": "settings",
};
/**
 * Check if the current route path is accessible by the user
 * @param pathname - Current URL pathname (e.g. '/user', '/role')
 * @returns true if user has access, false otherwise
 */
export function isRouteAccessible(pathname: string): boolean {
  // Always allow these routes regardless of scopes
  const alwaysAllowed = [
    "/personal-information",
    "/change-password",
    "/appearance", // every user picks their own theme; admin section is gated inside
    "/start",
    "/my-wakatime", // every user manages their own token
  ];
  if (alwaysAllowed.some((r) => pathname.startsWith(r))) return true;
  // Find matching scope for this route
  const matchedRoute = Object.keys(ROUTE_TO_SCOPE_MAP).find(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );

  if (!matchedRoute) {
    // If route is not in the map, allow by default (or deny — your choice)
    return true;
  }
  const scopePage = ROUTE_TO_SCOPE_MAP[matchedRoute];

  return hasPageAccess(scopePage);
}

// ═══════════════════════════════════════════════════════════════════════
// ACTIVITY TRACKING (for inactivity timeout)
// ═══════════════════════════════════════════════════════════════════════
/**
 * Update the last activity timestamp
 */

// export function updateLastActivity(): void {
//   const storage = getStorage();
//   if (!storage) return;
//   storage.setItem(STORAGE_KEYS.LAST_ACTIVITY, Date.now().toString());
// }

// /**
//  * Get last activity timestamp
//  */
// export function getLastActivity(): number {
//   const storage = getStorage();
//   if (!storage) return Date.now();
//   const ts = storage.getItem(STORAGE_KEYS.LAST_ACTIVITY);
//   return ts ? parseInt(ts, 10) : Date.now();
// }

// /**
//  * Get minutes since last activity
//  */
// export function getInactiveMinutes(): number {
//   const lastActivity = getLastActivity();
//   return (Date.now() - lastActivity) / (1000 * 60);
// }
