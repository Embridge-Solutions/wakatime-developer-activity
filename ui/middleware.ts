import { NextRequest, NextResponse } from 'next/server';
import { REDIRECT_PATH_AFTER_LOGIN } from './config/server-config';

const PUBLIC_ROUTES = ['/login'];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'));
}

function isAuthenticated(request: NextRequest): boolean {

    // 🔁 Fallback (optional)
  const cookieHeader = request.headers.get('cookie') || '';

  const hasAccess = cookieHeader.includes('accessToken_cookie=');
  const hasRefresh = cookieHeader.includes('refreshToken_cookie=');


  if(hasAccess || hasRefresh){
    return true
  }

    // ✅ Primary (correct way)
  const accessCookie = request.cookies.get('accessToken_cookie');
  const refreshCookie = request.cookies.get('refreshToken_cookie');

  if (accessCookie?.value || refreshCookie?.value) {
    return true;
  }


//  if(accessCookie === undefined || refreshCookie === undefined || hasAccess === false || hasRefresh === false){
//     return true;
//  }


  return false;

}

export function middleware(request: NextRequest) {
const { pathname } = request.nextUrl;
const authenticated = isAuthenticated(request);
  
   // ─── CASE 1: User visits root "/" → redirect based on auth status ───
  if (pathname === '/') {
    const target = authenticated ? REDIRECT_PATH_AFTER_LOGIN : '/login';
    return NextResponse.redirect(new URL(target, request.url));
  }

  // ─── CASE 2: User visits /login while already authenticated → go to dashboard ───
  if (isPublicRoute(pathname) && authenticated) {
    const redirectTo = request.nextUrl.searchParams.get('redirect') || REDIRECT_PATH_AFTER_LOGIN;
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  // ─── CASE 3: User visits /login and NOT authenticated → allow ───
  if (isPublicRoute(pathname) && !authenticated) {
    return NextResponse.next();
  }

   // ─── CASE 4: User visits a protected route but NOT authenticated → redirect to login ───
    if (!isPublicRoute(pathname) && !authenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

    // ─── CASE 5: Authenticated user on a protected route → allow ───
  return NextResponse.next();

}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

