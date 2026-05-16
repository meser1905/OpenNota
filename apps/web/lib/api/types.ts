/**
 * TypeScript shapes for the OpenNota API responses.
 *
 * Derived from `packages/db/prisma/schema.prisma`. The web app must not import
 * `@opennota/db`, so these interfaces are declared here. Date columns arrive
 * over the wire as ISO 8601 strings.
 */
import type { EducationLevel, TermType, UserRole } from '@opennota/shared';

/** A school. */
export interface Institution {
  id: string;
  name: string;
  taxId: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logoPath: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** A school year keyed to an institution. */
export interface AcademicYear {
  id: string;
  institutionId: string;
  year: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** A grading period within an academic year. */
export interface Term {
  id: string;
  academicYearId: string;
  name: string;
  type: TermType;
  number: number;
  startDate: string;
  endDate: string;
  isClosed: boolean;
  createdAt: string;
  updatedAt: string;
}

/** A class/section within an academic year. */
export interface ClassGroup {
  id: string;
  academicYearId: string;
  name: string;
  level: EducationLevel;
  year: number;
  section: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** A subject taught to a class group. */
export interface Subject {
  id: string;
  classGroupId: string;
  name: string;
  description: string | null;
  color: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** A User record. `passwordHash` is never returned by the API. */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** Teacher-specific data for a User with the TEACHER role. */
export interface TeacherProfile {
  id: string;
  userId: string;
  bio: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Student-specific data for a User with the STUDENT role. */
export interface StudentProfile {
  id: string;
  userId: string;
  nationalId: string;
  birthDate: string;
  studentNumber: string;
  createdAt: string;
  updatedAt: string;
}

/** Guardian-specific data for a User with the GUARDIAN role. */
export interface GuardianProfile {
  id: string;
  userId: string;
  nationalId: string | null;
  relationship: string;
  createdAt: string;
  updatedAt: string;
}

/** A User with its optional role-specific profiles, as returned by `GET /users/:id`. */
export interface UserWithProfiles extends User {
  teacherProfile: TeacherProfile | null;
  studentProfile: StudentProfile | null;
  guardianProfile: GuardianProfile | null;
}

/** A teacher-subject assignment with the teacher's profile and user joined in. */
export interface TeacherSubject {
  id: string;
  teacherId: string;
  subjectId: string;
  isLead: boolean;
  createdAt: string;
  teacher: TeacherProfile & { user: User };
}

/** A student's enrollment with the student's profile and user joined in. */
export interface Enrollment {
  id: string;
  studentId: string;
  classGroupId: string;
  academicYearId: string;
  enrolledAt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  student: StudentProfile & { user: User };
}
