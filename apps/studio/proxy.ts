import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { getPermissionForPath, getStudioRole, hasStudioPermission } from '@/lib/auth/accessControl';

const isProtectedRoute = createRouteMatcher([
  '/api/catalog(.*)',
  '/api/studio(.*)',
  '/apis(.*)',
  '/content(.*)',
  '/dashboard(.*)',
  '/films(.*)',
  '/import(.*)',
  '/infrastructure(.*)',
  '/moderation(.*)',
  '/queues(.*)',
  '/settings(.*)',
  '/shelves(.*)',
  '/users(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    await auth.protect();

    const authState = await auth();
    const permission = getPermissionForPath(req.nextUrl.pathname);
    const role = getStudioRole({
      orgRole: authState.orgRole,
      publicMetadata: authState.sessionClaims?.publicMetadata,
    });

    if (permission && !hasStudioPermission(role, permission)) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
    '/__clerk/(.*)',
  ],
};
