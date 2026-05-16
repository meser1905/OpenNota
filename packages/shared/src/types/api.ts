import type { UserRole } from '../enums';

/** Shape returned by the API's global exception filter for every error. */
export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  details?: unknown;
  timestamp: string;
  path: string;
}

/** Envelope returned by every paginated list endpoint. */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Authenticated user as carried in the JWT payload and exposed by `GET /auth/me`. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

/** Response body of the login and refresh endpoints. */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: AuthenticatedUser;
}
