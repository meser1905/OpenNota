export { auth as middleware } from '@/auth';

export const config = {
  // Run on every page route; skip API routes, Next internals and static files.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
