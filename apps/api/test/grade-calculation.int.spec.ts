import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrismaClient } from '@opennota/db';
import { InMemoryCache } from '@opennota/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GradeCalculationService } from '../src/modules/grades/grade-calculation.service';
import type { PrismaService } from '../src/common/prisma/prisma.service';

/**
 * Integration tests for {@link GradeCalculationService}.
 *
 * Each run provisions a throwaway SQLite database in the OS temp directory,
 * applies the Prisma schema to it with `prisma db push`, seeds a minimal data
 * set through a real `PrismaClient`, and exercises the service end to end —
 * `recalculate` must persist a `TermAverage` row, and `getTermAverage` must
 * serve a cached value. The temp database is deleted in `afterAll`, so no test
 * database survives the run.
 */

/** Absolute path to the @opennota/db package, where the Prisma schema lives. */
const DB_PACKAGE_DIR = join(__dirname, '..', '..', '..', 'packages', 'db');

/** Unique temp database path for this suite. */
const dbFile = join(
  tmpdir(),
  `opennota-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`,
);
const databaseUrl = `file:${dbFile}`;

let prisma: PrismaClient;
let service: GradeCalculationService;
let cache: InMemoryCache;

/** Ids of seeded rows, populated by `seedDataset`. */
const ids = {
  studentId: '',
  subjectId: '',
  termId: '',
  teacherUserId: '',
};

/** Applies the Prisma schema to the temp database via the Prisma CLI. */
function applySchema(): void {
  execFileSync(
    process.execPath,
    [
      join(DB_PACKAGE_DIR, 'node_modules', 'prisma', 'build', 'index.js'),
      'db',
      'push',
      '--skip-generate',
    ],
    {
      cwd: DB_PACKAGE_DIR,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'pipe',
    },
  );
}

/**
 * Inserts the smallest dataset that exercises a term average: one institution,
 * year, term, class group, subject, a teacher, a student with profile and
 * enrollment, a weight config, two evaluations and their grades.
 */
async function seedDataset(): Promise<void> {
  const institution = await prisma.institution.create({
    data: { name: 'Integration Test School' },
  });

  const academicYear = await prisma.academicYear.create({
    data: {
      institutionId: institution.id,
      year: 2026,
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-12-15'),
      isActive: true,
    },
  });

  const term = await prisma.term.create({
    data: {
      academicYearId: academicYear.id,
      name: 'Primer Trimestre',
      type: 'TRIMESTER',
      number: 1,
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-06-07'),
    },
  });

  const classGroup = await prisma.classGroup.create({
    data: {
      academicYearId: academicYear.id,
      name: '3ro A',
      level: 'SECONDARY',
      year: 3,
      section: 'A',
    },
  });

  const subject = await prisma.subject.create({
    data: { classGroupId: classGroup.id, name: 'Matemática' },
  });

  const teacherUser = await prisma.user.create({
    data: {
      email: 'teacher.int@opennota.local',
      passwordHash: 'not-a-real-hash',
      firstName: 'Test',
      lastName: 'Teacher',
      role: 'TEACHER',
      teacherProfile: { create: { bio: 'Integration test teacher' } },
    },
    include: { teacherProfile: true },
  });
  const teacherProfile = teacherUser.teacherProfile;
  if (teacherProfile === null) {
    throw new Error('Teacher profile was not created');
  }

  const studentUser = await prisma.user.create({
    data: {
      email: 'student.int@opennota.local',
      passwordHash: 'not-a-real-hash',
      firstName: 'Test',
      lastName: 'Student',
      role: 'STUDENT',
      studentProfile: {
        create: {
          nationalId: '99000001',
          studentNumber: '2026-9001',
          birthDate: new Date('2012-05-01'),
        },
      },
    },
    include: { studentProfile: true },
  });
  const studentProfile = studentUser.studentProfile;
  if (studentProfile === null) {
    throw new Error('Student profile was not created');
  }

  await prisma.enrollment.create({
    data: {
      studentId: studentProfile.id,
      classGroupId: classGroup.id,
      academicYearId: academicYear.id,
    },
  });

  // EXAM weight 60, ASSIGNMENT weight 40 (others 0) — both types are graded,
  // so the weights are used as-is.
  await prisma.gradingWeightConfig.create({
    data: {
      subjectId: subject.id,
      termId: term.id,
      examWeight: 60,
      assignmentWeight: 40,
      performanceWeight: 0,
      oralWeight: 0,
      projectWeight: 0,
    },
  });

  const examEvaluation = await prisma.evaluation.create({
    data: {
      subjectId: subject.id,
      termId: term.id,
      teacherId: teacherProfile.id,
      title: 'Examen Parcial 1',
      type: 'EXAM',
      date: new Date('2026-04-10'),
      scale: 'NUMERIC_1_10',
      maxScore: 10,
      minScore: 1,
      passingScore: 6,
      weight: 1,
      isPublished: true,
    },
  });

  const assignmentEvaluation = await prisma.evaluation.create({
    data: {
      subjectId: subject.id,
      termId: term.id,
      teacherId: teacherProfile.id,
      title: 'Trabajo Práctico 1',
      type: 'ASSIGNMENT',
      date: new Date('2026-05-08'),
      scale: 'NUMERIC_1_10',
      maxScore: 10,
      minScore: 1,
      passingScore: 6,
      weight: 1,
      isPublished: true,
    },
  });

  // Exam 9, assignment 5. Type averages: EXAM 9, ASSIGNMENT 5.
  // average = 9*(60/100) + 5*(40/100) = 5.4 + 2.0 = 7.4.
  await prisma.grade.create({
    data: {
      evaluationId: examEvaluation.id,
      studentId: studentProfile.id,
      numericValue: 9,
      gradedById: teacherUser.id,
    },
  });
  await prisma.grade.create({
    data: {
      evaluationId: assignmentEvaluation.id,
      studentId: studentProfile.id,
      numericValue: 5,
      gradedById: teacherUser.id,
    },
  });

  ids.studentId = studentProfile.id;
  ids.subjectId = subject.id;
  ids.termId = term.id;
  ids.teacherUserId = teacherUser.id;
}

describe('GradeCalculationService (integration)', () => {
  beforeAll(async () => {
    applySchema();
    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    await prisma.$connect();
    await seedDataset();
    cache = new InMemoryCache();
    // PrismaService extends PrismaClient; the service only uses PrismaClient
    // members, so the real client stands in for it directly.
    service = new GradeCalculationService(prisma as unknown as PrismaService, cache);
  }, 60_000);

  afterAll(async () => {
    await prisma?.$disconnect();
    for (const suffix of ['', '-journal', '-wal', '-shm']) {
      const path = `${dbFile}${suffix}`;
      if (existsSync(path)) {
        rmSync(path, { force: true });
      }
    }
    expect(existsSync(dbFile)).toBe(false);
  });

  it('starts with no persisted term average', async () => {
    const existing = await prisma.termAverage.findUnique({
      where: {
        studentId_subjectId_termId: {
          studentId: ids.studentId,
          subjectId: ids.subjectId,
          termId: ids.termId,
        },
      },
    });

    expect(existing).toBeNull();
  });

  it('recalculate computes the average and writes a TermAverage row', async () => {
    const result = await service.recalculate(ids.studentId, ids.subjectId, ids.termId);

    expect(result.hasGrades).toBe(true);
    expect(result.average).toBe(7.4);
    expect(result.passed).toBe(true);
    expect(result.gradedEvaluations).toBe(2);
    expect(result.totalEvaluations).toBe(2);

    const persisted = await prisma.termAverage.findUnique({
      where: {
        studentId_subjectId_termId: {
          studentId: ids.studentId,
          subjectId: ids.subjectId,
          termId: ids.termId,
        },
      },
    });

    expect(persisted).not.toBeNull();
    expect(persisted?.average).toBe(7.4);
    expect(persisted?.passed).toBe(true);
    expect(persisted?.conceptualAverage).toBe('VERY_GOOD');
  });

  it('recalculate is idempotent and updates the existing row', async () => {
    await service.recalculate(ids.studentId, ids.subjectId, ids.termId);
    const second = await service.recalculate(ids.studentId, ids.subjectId, ids.termId);

    expect(second.average).toBe(7.4);

    // Still exactly one row for this (student, subject, term).
    const rows = await prisma.termAverage.findMany({
      where: { studentId: ids.studentId, subjectId: ids.subjectId, termId: ids.termId },
    });
    expect(rows).toHaveLength(1);
  });

  it('getTermAverage serves a cached value without recomputing', async () => {
    const cacheKey = `term-average:${ids.studentId}:${ids.subjectId}:${ids.termId}`;
    await cache.delete(cacheKey);
    expect(await cache.has(cacheKey)).toBe(false);

    // First read is a cache miss: it computes and populates the cache.
    const first = await service.getTermAverage(ids.studentId, ids.subjectId, ids.termId);
    expect(first.average).toBe(7.4);
    expect(await cache.has(cacheKey)).toBe(true);

    // Poison the cache with a sentinel; a cached read must return it verbatim,
    // proving the database was not consulted again.
    const sentinel = { ...first, average: 1.23 };
    await cache.set(cacheKey, sentinel);
    const cached = await service.getTermAverage(ids.studentId, ids.subjectId, ids.termId);
    expect(cached.average).toBe(1.23);
  });

  it('invalidate drops the cached average', async () => {
    const cacheKey = `term-average:${ids.studentId}:${ids.subjectId}:${ids.termId}`;
    await service.getTermAverage(ids.studentId, ids.subjectId, ids.termId);
    expect(await cache.has(cacheKey)).toBe(true);

    await service.invalidate(ids.studentId, ids.subjectId, ids.termId);
    expect(await cache.has(cacheKey)).toBe(false);
  });

  it('reports no grades for a subject/term the student has not been graded in', async () => {
    const otherTerm = await prisma.term.findFirstOrThrow();
    // A fresh term with no evaluations: nothing graded.
    const emptyTerm = await prisma.term.create({
      data: {
        academicYearId: otherTerm.academicYearId,
        name: 'Segundo Trimestre',
        type: 'TRIMESTER',
        number: 2,
        startDate: new Date('2026-06-08'),
        endDate: new Date('2026-09-13'),
      },
    });

    const result = await service.recalculate(ids.studentId, ids.subjectId, emptyTerm.id);

    expect(result.hasGrades).toBe(false);
    expect(result.average).toBe(0);

    // With no grades, `recalculate` must not persist a row.
    const persisted = await prisma.termAverage.findUnique({
      where: {
        studentId_subjectId_termId: {
          studentId: ids.studentId,
          subjectId: ids.subjectId,
          termId: emptyTerm.id,
        },
      },
    });
    expect(persisted).toBeNull();
  });
});
