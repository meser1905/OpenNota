import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { JobRunner } from '@opennota/shared';
import type { JwtPayload } from '../../common/auth/jwt-payload';
import { JOB_RUNNER } from '../../common/jobs/jobs.module';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AppConfig } from '../../config/app-config';
import { GradeCalculationService } from '../grades/grade-calculation.service';

export interface ReportCardEvaluation {
  id: string;
  title: string;
  type: string;
  date: Date;
  maxScore: number;
  numericValue: number | null;
  conceptualValue: string | null;
  wasAbsent: boolean;
}

export interface ReportCardSubject {
  subjectId: string;
  name: string;
  color: string | null;
  average: number;
  conceptualAverage: string | null;
  passed: boolean;
  hasGrades: boolean;
  evaluations: ReportCardEvaluation[];
}

export interface ReportCard {
  student: { id: string; firstName: string; lastName: string; studentNumber: string };
  institution: string;
  classGroup: string | null;
  term: { name: string; type: string };
  academicYear: number;
  subjects: ReportCardSubject[];
  overallAverage: number;
  generatedAt: Date;
}

const STAFF_ROLES = new Set(['ADMIN', 'PRINCIPAL', 'TEACHER']);

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculation: GradeCalculationService,
    private readonly config: AppConfig,
    @Inject(JOB_RUNNER) private readonly jobRunner: JobRunner,
  ) {}

  /** Builds a student's full report card for a term. */
  async getReportCard(user: JwtPayload, studentId: string, termId: string): Promise<ReportCard> {
    await this.assertCanViewStudent(user, studentId);

    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: { user: true },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    const term = await this.prisma.term.findUnique({
      where: { id: termId },
      include: { academicYear: { include: { institution: true } } },
    });
    if (!term) {
      throw new NotFoundException('Term not found');
    }

    const enrollment = await this.prisma.enrollment.findFirst({
      where: { studentId, academicYearId: term.academicYearId, isActive: true },
      include: { classGroup: { include: { subjects: { where: { deletedAt: null } } } } },
    });
    const subjects = enrollment?.classGroup.subjects ?? [];

    const subjectReports: ReportCardSubject[] = [];
    for (const subject of subjects) {
      const average = await this.calculation.getTermAverage(studentId, subject.id, termId);
      const evaluations = await this.prisma.evaluation.findMany({
        where: { subjectId: subject.id, termId, isPublished: true, deletedAt: null },
        orderBy: { date: 'asc' },
      });
      const grades = await this.prisma.grade.findMany({
        where: { studentId, evaluationId: { in: evaluations.map((item) => item.id) } },
      });
      const gradeByEvaluation = new Map(grades.map((grade) => [grade.evaluationId, grade]));

      subjectReports.push({
        subjectId: subject.id,
        name: subject.name,
        color: subject.color,
        average: average.average,
        conceptualAverage: average.conceptualAverage,
        passed: average.passed,
        hasGrades: average.hasGrades,
        evaluations: evaluations.map((evaluation) => {
          const grade = gradeByEvaluation.get(evaluation.id);
          return {
            id: evaluation.id,
            title: evaluation.title,
            type: evaluation.type,
            date: evaluation.date,
            maxScore: evaluation.maxScore,
            numericValue: grade?.numericValue ?? null,
            conceptualValue: grade?.conceptualValue ?? null,
            wasAbsent: grade?.wasAbsent ?? false,
          };
        }),
      });
    }

    const graded = subjectReports.filter((subject) => subject.hasGrades);
    const overallAverage =
      graded.length > 0
        ? roundToTwo(graded.reduce((sum, subject) => sum + subject.average, 0) / graded.length)
        : 0;

    return {
      student: {
        id: student.id,
        firstName: student.user.firstName,
        lastName: student.user.lastName,
        studentNumber: student.studentNumber,
      },
      institution: term.academicYear.institution.name,
      classGroup: enrollment?.classGroup.name ?? null,
      term: { name: term.name, type: term.type },
      academicYear: term.academicYear.year,
      subjects: subjectReports,
      overallAverage,
      generatedAt: new Date(),
    };
  }

  /** Builds a class-group-wide average matrix for a term (staff view). */
  async getClassGroupReport(classGroupId: string, termId: string) {
    const classGroup = await this.prisma.classGroup.findFirst({
      where: { id: classGroupId, deletedAt: null },
      include: { subjects: { where: { deletedAt: null }, orderBy: { name: 'asc' } } },
    });
    if (!classGroup) {
      throw new NotFoundException('Class group not found');
    }
    const term = await this.prisma.term.findUnique({ where: { id: termId } });
    if (!term) {
      throw new NotFoundException('Term not found');
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: { classGroupId, isActive: true },
      include: { student: { include: { user: true } } },
      orderBy: { student: { user: { lastName: 'asc' } } },
    });

    const students = [];
    for (const enrollment of enrollments) {
      const subjectAverages = [];
      for (const subject of classGroup.subjects) {
        const average = await this.calculation.getTermAverage(
          enrollment.student.id,
          subject.id,
          termId,
        );
        subjectAverages.push({
          subjectId: subject.id,
          average: average.average,
          hasGrades: average.hasGrades,
          passed: average.passed,
        });
      }
      const graded = subjectAverages.filter((subject) => subject.hasGrades);
      students.push({
        studentId: enrollment.student.id,
        firstName: enrollment.student.user.firstName,
        lastName: enrollment.student.user.lastName,
        studentNumber: enrollment.student.studentNumber,
        subjectAverages,
        overallAverage:
          graded.length > 0
            ? roundToTwo(graded.reduce((sum, item) => sum + item.average, 0) / graded.length)
            : 0,
      });
    }

    return {
      classGroup: { id: classGroup.id, name: classGroup.name },
      term: { id: term.id, name: term.name },
      subjects: classGroup.subjects.map((subject) => ({ id: subject.id, name: subject.name })),
      students,
    };
  }

  /** Writes a copy of a generated report card PDF to the local PDF directory. */
  enqueueReportCardCopy(reportCard: ReportCard, pdf: Buffer): void {
    const fileName =
      `boletin-${reportCard.student.studentNumber}-${reportCard.term.name}.pdf`.replace(
        /\s+/g,
        '-',
      );
    const filePath = join(this.config.pdfOutputDir, fileName);
    this.jobRunner.enqueue(
      'save-report-card-pdf',
      async (payload: { path: string; data: Buffer }) => {
        await mkdir(this.config.pdfOutputDir, { recursive: true });
        await writeFile(payload.path, payload.data);
      },
      { path: filePath, data: pdf },
    );
  }

  private async assertCanViewStudent(user: JwtPayload, studentId: string): Promise<void> {
    if (STAFF_ROLES.has(user.role)) {
      return;
    }
    const student = await this.prisma.studentProfile.findUnique({ where: { id: studentId } });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    if (user.role === 'STUDENT') {
      if (student.userId !== user.sub) {
        throw new ForbiddenException('You can only view your own report card');
      }
      return;
    }
    if (user.role === 'GUARDIAN') {
      const link = await this.prisma.studentGuardian.findFirst({
        where: { studentId, guardian: { userId: user.sub } },
      });
      if (!link) {
        throw new ForbiddenException('You can only view report cards for your students');
      }
      return;
    }
    throw new ForbiddenException('You do not have permission to view this report card');
  }
}
