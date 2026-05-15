import { Injectable, NotFoundException } from '@nestjs/common';
import type { Subject, TeacherSubject } from '@opennota/db';
import type { AssignTeacherInput, CreateSubjectInput, UpdateSubjectInput } from '@opennota/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * CRUD for Subject records plus teacher-subject assignments. Subjects are
 * soft-deleted; TeacherSubject rows are hard-deleted (no `deletedAt`).
 */
@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(classGroupId?: string) {
    return this.prisma.subject.findMany({
      where: { deletedAt: null, ...(classGroupId ? { classGroupId } : {}) },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const subject = await this.prisma.subject.findFirst({
      where: { id, deletedAt: null },
    });
    if (!subject) {
      throw new NotFoundException(`Subject ${id} was not found`);
    }
    return subject;
  }

  create(input: CreateSubjectInput): Promise<Subject> {
    return this.prisma.subject.create({ data: input });
  }

  async update(id: string, input: UpdateSubjectInput) {
    await this.findOne(id);
    return this.prisma.subject.update({ where: { id }, data: input });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.subject.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  }

  /** Lists teacher assignments for a subject, including the teacher's user. */
  async findTeachers(subjectId: string) {
    await this.findOne(subjectId);
    return this.prisma.teacherSubject.findMany({
      where: { subjectId },
      include: { teacher: { include: { user: { omit: { passwordHash: true } } } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Assigns a teacher to a subject. The subject from the route path is
   * authoritative; `teacherId` refers to a TeacherProfile id.
   */
  async assignTeacher(subjectId: string, input: AssignTeacherInput): Promise<TeacherSubject> {
    await this.findOne(subjectId);
    return this.prisma.teacherSubject.create({
      data: { subjectId, teacherId: input.teacherId, isLead: input.isLead },
    });
  }

  /** Removes a teacher-subject assignment. */
  async removeTeacher(subjectId: string, assignmentId: string) {
    await this.findOne(subjectId);
    const assignment = await this.prisma.teacherSubject.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment || assignment.subjectId !== subjectId) {
      throw new NotFoundException(`Assignment ${assignmentId} was not found on this subject`);
    }
    await this.prisma.teacherSubject.delete({ where: { id: assignmentId } });
    return { success: true };
  }
}
