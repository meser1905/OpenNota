import type { UserRole } from '@opennota/shared';
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  /** Returned by the credentials provider's `authorize`. */
  interface User {
    id?: string;
    role: UserRole;
    firstName: string;
    lastName: string;
    accessToken: string;
    refreshToken: string;
  }

  /** Exposed to the app via `useSession` / `auth()`. */
  interface Session {
    user: {
      id: string;
      role: UserRole;
      firstName: string;
      lastName: string;
    } & DefaultSession['user'];
    accessToken: string;
    error?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
    firstName: string;
    lastName: string;
    accessToken: string;
    refreshToken: string;
    accessTokenExpires: number;
    error?: string;
  }
}
