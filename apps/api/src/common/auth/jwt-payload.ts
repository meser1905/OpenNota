import type { UserRole } from '@opennota/shared';

/** Access-token claims. Attached to `request.user` by {@link JwtAuthGuard}. */
export interface JwtPayload {
  /** User id. */
  sub: string;
  email: string;
  role: UserRole;
}
