import { type UserRole, USER_ROLES } from '@opennota/shared';

/** A dashboard route prefix and the roles permitted to open it. */
export interface RoutePermission {
  prefix: string;
  roles: readonly UserRole[];
}

/**
 * Canonical map of dashboard route -> allowed roles. Single source of truth
 * for the sidebar (`nav-config`) and the middleware role gate (`auth.ts`),
 * and the mirror of the API's `@Roles(...)` decorators. A route that is not
 * listed here is open to every authenticated role.
 *
 * This module is imported by edge middleware, so it must stay free of any
 * Node-only or heavy dependencies.
 */
export const ROUTE_PERMISSIONS: readonly RoutePermission[] = [
  { prefix: '/institutions', roles: ['ADMIN'] },
  { prefix: '/academic-years', roles: ['ADMIN', 'PRINCIPAL'] },
  { prefix: '/class-groups', roles: ['ADMIN', 'PRINCIPAL'] },
  { prefix: '/enrollments', roles: ['ADMIN', 'PRINCIPAL'] },
  { prefix: '/users', roles: ['ADMIN'] },
  { prefix: '/subjects', roles: ['ADMIN', 'PRINCIPAL', 'TEACHER'] },
  { prefix: '/evaluations', roles: ['ADMIN', 'PRINCIPAL', 'TEACHER'] },
  { prefix: '/grades', roles: ['ADMIN', 'PRINCIPAL', 'TEACHER'] },
  { prefix: '/report-cards', roles: USER_ROLES },
];

/** Roles allowed to open an exact dashboard route; used to filter the sidebar. */
export function rolesForRoute(href: string): readonly UserRole[] {
  return ROUTE_PERMISSIONS.find((entry) => entry.prefix === href)?.roles ?? USER_ROLES;
}

/** Whether `role` may open `pathname`. Routes with no rule are open to all. */
export function canAccessRoute(role: UserRole, pathname: string): boolean {
  const match = ROUTE_PERMISSIONS.find(
    (entry) => pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`),
  );
  return match ? match.roles.includes(role) : true;
}
