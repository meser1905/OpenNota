import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import type { JWT } from 'next-auth/jwt';
import type { UserRole } from '@opennota/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

// The API access token lives 15 minutes; refresh a minute early.
const ACCESS_TOKEN_TTL_MS = 14 * 60 * 1000;

interface ApiAuthResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; firstName: string; lastName: string; role: UserRole };
}

/** Exchanges a refresh token with the API for a fresh token pair. */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: token.refreshToken }),
  });
  if (!response.ok) {
    return { ...token, error: 'RefreshAccessTokenError' };
  }
  const data = (await response.json()) as ApiAuthResponse;
  return {
    ...token,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    accessTokenExpires: Date.now() + ACCESS_TOKEN_TTL_MS,
    error: undefined,
  };
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET ?? 'opennota-development-secret-do-not-use-in-production',
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (credentials) => {
        const response = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: String(credentials.email ?? ''),
            password: String(credentials.password ?? ''),
          }),
        });
        if (!response.ok) {
          return null;
        }
        const data = (await response.json()) as ApiAuthResponse;
        return {
          id: data.user.id,
          email: data.user.email,
          name: `${data.user.firstName} ${data.user.lastName}`,
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          role: data.user.role,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        };
      },
    }),
  ],
  callbacks: {
    authorized: ({ auth: session, request }) => {
      const isLoggedIn = Boolean(session?.user);
      const isOnLogin = request.nextUrl.pathname.startsWith('/login');
      if (isOnLogin) {
        return isLoggedIn ? Response.redirect(new URL('/', request.nextUrl)) : true;
      }
      return isLoggedIn;
    },
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id ?? '';
        token.role = user.role;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.accessTokenExpires = Date.now() + ACCESS_TOKEN_TTL_MS;
        return token;
      }
      if (Date.now() < token.accessTokenExpires) {
        return token;
      }
      return refreshAccessToken(token);
    },
    session: ({ session, token }) => {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.firstName = token.firstName;
      session.user.lastName = token.lastName;
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },
  },
});
