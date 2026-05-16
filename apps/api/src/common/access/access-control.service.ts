import { ForbiddenException, Injectable } from '@nestjs/common';
import type { UserRole } from '@opennota/shared';
import type { JwtPayload } from '../auth/jwt-payload';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Central authority for resource-level (ownership) permission checks.
 *
 * Coarse role gating lives in `@Roles(...)` metadata enforced by the
 * {@link RolesGuard}. This service answers the finer questions a role alone
 * cannot: *which* subjects a teacher may grade, *which* students' academic
 * data a user may read. Keeping that logic here means every module enforces
 * the same rules instead of re-deriving them.
 */
@Injectable()
export class AccessControlService {
  constructor(private readonly prisma: PrismaService) {}

  /** Staff (ADMIN, PRINCIPAL) are unscoped: they may act on any resource. */
  isStaff(role: UserRole): boolean {
    return role === 'ADMIN' || role === 'PRINCIPAL';
  }

  /** TeacherProfile-subject ids the teacher (identified by user id) teaches. */
  async teacherSubjectIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.teacherSubject.findMany({
      where: { teacher: { userId } },
      select: { subjectId: true },
    });
    return rows.map((row) => row.subjectId);
  }

  /**
   * Whether the user may manage (grade, evaluate, weight) the subject. Staff
   * always may; a teacher only for subjects they are assigned to.
   */
  async canManageSubject(user: JwtPayload, subjectId: string): Promise<boolean> {
    if (this.isStaff(user.role)) {
      return true;
    }
    if (user.role !== 'TEACHER') {
      return false;
    }
    const assignment = await this.prisma.teacherSubject.findFirst({
      where: { subjectId, teacher: { userId: user.sub } },
    });
    return assignment !== null;
  }

  /** Throws {@link ForbiddenException} unless {@link canManageSubject} holds. */
  async assertCanManageSubject(user: JwtPayload, subjectId: string): Promise<void> {
    if (!(await this.canManageSubject(user, subjectId))) {
      throw new ForbiddenException('You are not assigned to this subject');
    }
  }

  /**
   * Whether the user may read the given student's academic data:
   *   - staff: any student;
   *   - teacher: students enrolled in a class group they teach a subject in;
   *   - student: only themselves;
   *   - guardian: only their linked students.
   */
  async canViewStudent(user: JwtPayload, studentId: string): Promise<boolean> {
    if (this.isStaff(user.role)) {
      return true;
    }
    if (user.role === 'STUDENT') {
      const profile = await this.prisma.studentProfile.findUnique({
        where: { id: studentId },
        select: { userId: true },
      });
      return profile?.userId === user.sub;
    }
    if (user.role === 'GUARDIAN') {
      const link = await this.prisma.studentGuardian.findFirst({
        where: { studentId, guardian: { userId: user.sub } },
      });
      return link !== null;
    }
    if (user.role === 'TEACHER') {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: {
          studentId,
          isActive: true,
          classGroup: {
            subjects: {
              some: {
                deletedAt: null,
                teacherSubjects: { some: { teacher: { userId: user.sub } } },
              },
            },
          },
        },
      });
      return enrollment !== null;
    }
    return false;
  }

  /** Throws {@link ForbiddenException} unless {@link canViewStudent} holds. */
  async assertCanViewStudent(user: JwtPayload, studentId: string): Promise<void> {
    if (!(await this.canViewStudent(user, studentId))) {
      throw new ForbiddenException('You do not have permission to view this student');
    }
  }

  /**
   * StudentProfile ids a teacher may read: every active enrollment in a class
   * group where the teacher teaches at least one subject.
   */
  async teacherStudentIds(userId: string): Promise<string[]> {
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        isActive: true,
        classGroup: {
          subjects: {
            some: {
              deletedAt: null,
              teacherSubjects: { some: { teacher: { userId } } },
            },
          },
        },
      },
      select: { studentId: true },
    });
    return [...new Set(enrollments.map((enrollment) => enrollment.studentId))];
  }
}
