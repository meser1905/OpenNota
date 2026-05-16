import {
  BookOpen,
  Building2,
  CalendarRange,
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutDashboard,
  type LucideIcon,
  PenSquare,
  UserCog,
  Users,
} from 'lucide-react';
import type { UserRole } from '@opennota/shared';
import { rolesForRoute } from '@/lib/route-permissions';

export interface NavItem {
  href: string;
  /** Key under the `nav` namespace of the i18n messages. */
  labelKey: string;
  icon: LucideIcon;
  roles: readonly UserRole[];
}

/** Sidebar entries; `roles` are resolved from the shared route-permission map. */
const NAV_DEFINITIONS: ReadonlyArray<Omit<NavItem, 'roles'>> = [
  { href: '/', labelKey: 'dashboard', icon: LayoutDashboard },
  { href: '/institutions', labelKey: 'institutions', icon: Building2 },
  { href: '/academic-years', labelKey: 'academicYears', icon: CalendarRange },
  { href: '/class-groups', labelKey: 'classGroups', icon: Users },
  { href: '/subjects', labelKey: 'subjects', icon: BookOpen },
  { href: '/enrollments', labelKey: 'enrollments', icon: GraduationCap },
  { href: '/evaluations', labelKey: 'evaluations', icon: ClipboardList },
  { href: '/grades', labelKey: 'grades', icon: PenSquare },
  { href: '/report-cards', labelKey: 'reportCards', icon: FileText },
  { href: '/users', labelKey: 'users', icon: UserCog },
];

/** Sidebar navigation, filtered per role by the consumer. */
export const NAV_ITEMS: NavItem[] = NAV_DEFINITIONS.map((definition) => ({
  ...definition,
  roles: rolesForRoute(definition.href),
}));
