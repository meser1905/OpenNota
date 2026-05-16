import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Evaluation, Grade } from '@opennota/db';
import type { BatchUpsertGradesInput, UpsertGradeInput } from '@opennota/shared';
import { AccessControlService } from '../../common/access/access-control.service';
import type { JwtPayload } from '../../common/auth/jwt-payload';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GradeCalculationService } from './grade-calculation.service';

@Injectable()
export class GradesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculation: GradeCalculationService,
    private readonly access: AccessControlService,
  ) {}

  /** Creates or updates one student's grade for an evaluation. */
  async upsertGrade(user: JwtPayload, input: UpsertGradeInput): Promise<Grade> {
    const evaluation = await this.loadGradableEvaluation(user, input.evaluationId);
    const grade = await this.prisma.grade.upsert({
      where: {
        evaluationId_studentId: {
          evaluationId: input.evaluationId,
          studentId: input.studentId,
        },
      },
      create: {
        evaluationId: input.evaluationId,
        studentId: input.studentId,
        numericValue: input.numericValue ?? null,
        conceptualValue: input.conceptualValue ?? null,
        comments: input.comments ?? null,
        wasAbsent: input.wasAbsent,
        gradedById: user.sub,
      },
      update: {
        numericValue: input.numericValue ?? null,
        conceptualValue: input.conceptualValue ?? null,
        comments: input.comments ?? null,
        wasAbsent: input.wasAbsent,
        gradedById: user.sub,
        gradedAt: new Date(),
      },
    });
    await this.calculation.recalculate(input.studentId, evaluation.subjectId, evaluation.termId);
    return grade;
  }

  /** Creates or updates every grade for one evaluation in a single transaction. */
  async batchUpsert(user: JwtPayload, input: BatchUpsertGradesInput): Promise<{ updated: number }> {
    const evaluation = await this.loadGradableEvaluation(user, input.evaluationId);
    await this.prisma.$transaction(
      input.grades.map((entry) =>
        this.prisma.grade.upsert({
          where: {
            evaluationId_studentId: {
              evaluationId: input.evaluationId,
              studentId: entry.studentId,
            },
          },
          create: {
            evaluationId: input.evaluationId,
            studentId: entry.studentId,
            numericValue: entry.numericValue ?? null,
            conceptualValue: entry.conceptualValue ?? null,
            comments: entry.comments ?? null,
            wasAbsent: entry.wasAbsent,
            gradedById: user.sub,
          },
          update: {
            numericValue: entry.numericValue ?? null,
            conceptualValue: entry.conceptualValue ?? null,
            comments: entry.comments ?? null,
            wasAbsent: entry.wasAbsent,
            gradedById: user.sub,
            gradedAt: new Date(),
          },
        }),
      ),
    );
    for (const entry of input.grades) {
      await this.calculation.recalculate(entry.studentId, evaluation.subjectId, evaluation.termId);
    }
    return { updated: input.grades.length };
  }

  async listByEvaluation(user: JwtPayload, evaluationId: string | undefined) {
    if (!evaluationId) {
      throw new BadRequestException('The evaluationId query parameter is required');
    }
    const evaluation = await this.prisma.evaluation.findFirst({
      where: { id: evaluationId, deletedAt: null },
    });
    if (!evaluation) {
      throw new NotFoundException('Evaluation not found');
    }
    await this.access.assertCanManageSubject(user, evaluation.subjectId);
    return this.prisma.grade.findMany({
      where: { evaluationId },
      include: { student: { include: { user: { omit: { passwordHash: true } } } } },
      orderBy: { student: { user: { lastName: 'asc' } } },
    });
  }

  /** Returns the students-by-evaluations matrix used by the grade entry sheet. */
  async getGradeSheet(user: JwtPayload, subjectId: string | undefined, termId: string | undefined) {
    if (!subjectId || !termId) {
      throw new BadRequestException('Both subjectId and termId query parameters are required');
    }
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, deletedAt: null },
    });
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }
    await this.access.assertCanManageSubject(user, subjectId);

    const evaluations = await this.prisma.evaluation.findMany({
      where: { subjectId, termId, deletedAt: null },
      orderBy: { date: 'asc' },
    });
    const enrollments = await this.prisma.enrollment.findMany({
      where: { classGroupId: subject.classGroupId, isActive: true },
      include: { student: { include: { user: true } } },
      orderBy: { student: { user: { lastName: 'asc' } } },
    });
    const evaluationIds = evaluations.map((evaluation) => evaluation.id);
    const grades =
      evaluationIds.length > 0
        ? await this.prisma.grade.findMany({ where: { evaluationId: { in: evaluationIds } } })
        : [];

    return {
      subject: { id: subject.id, name: subject.name },
      evaluations: evaluations.map((evaluation) => ({
        id: evaluation.id,
        title: evaluation.title,
        type: evaluation.type,
        date: evaluation.date,
        scale: evaluation.scale,
        maxScore: evaluation.maxScore,
        passingScore: evaluation.passingScore,
        isPublished: evaluation.isPublished,
      })),
      students: enrollments.map((enrollment) => ({
        id: enrollment.student.id,
        firstName: enrollment.student.user.firstName,
        lastName: enrollment.student.user.lastName,
        studentNumber: enrollment.student.studentNumber,
      })),
      grades: grades.map((grade) => ({
        evaluationId: grade.evaluationId,
        studentId: grade.studentId,
        numericValue: grade.numericValue,
        conceptualValue: grade.conceptualValue,
        wasAbsent: grade.wasAbsent,
        comments: grade.comments,
      })),
    };
  }

  /** Loads an evaluation and asserts the user may edit grades for it. */
  private async loadGradableEvaluation(
    user: JwtPayload,
    evaluationId: string,
  ): Promise<Evaluation> {
    const evaluation = await this.prisma.evaluation.findFirst({
      where: { id: evaluationId, deletedAt: null },
    });
    if (!evaluation) {
      throw new NotFoundException('Evaluation not found');
    }
    if (!evaluation.isPublished) {
      throw new BadRequestException('Grades can only be entered for a published evaluation');
    }
    const term = await this.prisma.term.findUnique({ where: { id: evaluation.termId } });
    if (term?.isClosed === true) {
      throw new BadRequestException('This term is closed and no longer accepts grade changes');
    }
    await this.access.assertCanManageSubject(user, evaluation.subjectId);
    return evaluation;
  }
}
