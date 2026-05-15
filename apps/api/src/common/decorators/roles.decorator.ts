import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@opennota/shared';

export const ROLES_KEY = 'opennota:roles';

/** Restricts a route to the listed roles. Enforced by {@link RolesGuard}. */
export const Roles = (...roles: UserRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
