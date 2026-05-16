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
import { USER_ROLES, type UserRole } from '@opennota/shared';

export interface NavItem {
  href: string;
  /** Key under the `nav` namespace of the i18n messages. */
  labelKey: string;
  icon: LucideIcon;
  roles: readonly UserRole[];
}

/** Sidebar navigation, filtered per role by the consumer. */
export const NAV_ITEMS: NavItem[] = [
  { href: '/', labelKey: 'dashboard', icon: LayoutDashboard, roles: USER_ROLES },
  { href: '/institutions', labelKey: 'institutions', icon: Building2, roles: ['ADMIN'] },
  {
    href: '/academic-years',
    labelKey: 'academicYears',
    icon: CalendarRange,
    roles: ['ADMIN', 'PRINCIPAL'],
  },
  { href: '/class-groups', labelKey: 'classGroups', icon: Users, roles: ['ADMIN', 'PRINCIPAL'] },
  {
    href: '/subjects',
    labelKey: 'subjects',
    icon: BookOpen,
    roles: ['ADMIN', 'PRINCIPAL', 'TEACHER'],
  },
  {
    href: '/enrollments',
    labelKey: 'enrollments',
    icon: GraduationCap,
    roles: ['ADMIN', 'PRINCIPAL'],
  },
  {
    href: '/evaluations',
    labelKey: 'evaluations',
    icon: ClipboardList,
    roles: ['ADMIN', 'PRINCIPAL', 'TEACHER'],
  },
  {
    href: '/grades',
    labelKey: 'grades',
    icon: PenSquare,
    roles: ['ADMIN', 'PRINCIPAL', 'TEACHER'],
  },
  { href: '/report-cards', labelKey: 'reportCards', icon: FileText, roles: USER_ROLES },
  { href: '/users', labelKey: 'users', icon: UserCog, roles: ['ADMIN'] },
];
