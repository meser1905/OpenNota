import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ForbiddenException } from '@nestjs/common';
import { PrismaClient } from '@opennota/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AccessControlService } from '../src/common/access/access-control.service';
import type { JwtPayload } from '../src/common/auth/jwt-payload';
import type { PrismaService } from '../src/common/prisma/prisma.service';

/**
 * Integration tests for {@link AccessControlService}, the central authority
 * for resource-level permission checks.
 *
 * The fixture is a two-class school: a teacher assigned to a subject in class
 * A only, a student and guardian in class A, and an unrelated student in
 * class B. Each run provisions a throwaway SQLite database, applies the
 * schema, seeds the fixture and exercises the service directly.
 */

/** Absolute path to the @opennota/db package, where the Prisma schema lives. */
const DB_PACKAGE_DIR = join(__dirname, '..', '..', '..', 'packages', 'db');

/** Unique temp database path for this suite. */
const dbFile = join(
  tmpdir(),
  `opennota-access-${Date.now()}-${Math.random().toString(36).slice(2)}.db`,
);
const databaseUrl = `file:${dbFile}`;

let prisma: PrismaClient;
let access: AccessControlService;

/** Ids of seeded rows, populated by `seedDataset`. */
const ids = {
  teacherUserId: '',
  subjectAId: '',
  subjectBId: '',
  studentAUserId: '',
  studentAProfileId: '',
  studentBUserId: '',
  studentBProfileId: '',
  guardianUserId: '',
};

/** Builds an access-token payload for the given user and role. */
function payload(sub: string, role: JwtPayload['role']): JwtPayload {
  return { sub, email: `${role.toLowerCase()}@test.local`, role };
}

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
 * Seeds a two-class school: class A has a subject taught by `teacher`, an
 * enrolled `studentA` and a guardian linked to that student; class B has its
 * own subject and an unrelated `studentB`.
 */
async function seedDataset(): Promise<void> {
  const institution = await prisma.institution.create({
    data: { name: 'Access Control Test School' },
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

  const classGroupA = await prisma.classGroup.create({
    data: {
      academicYearId: academicYear.id,
      name: '3ro A',
      level: 'SECONDARY',
      year: 3,
      section: 'A',
    },
  });
  const classGroupB = await prisma.classGroup.create({
    data: {
      academicYearId: academicYear.id,
      name: '3ro B',
      level: 'SECONDARY',
      year: 3,
      section: 'B',
    },
  });

  const subjectA = await prisma.subject.create({
    data: { classGroupId: classGroupA.id, name: 'Matemática A' },
  });
  const subjectB = await prisma.subject.create({
    data: { classGroupId: classGroupB.id, name: 'Matemática B' },
  });

  const teacherUser = await prisma.user.create({
    data: {
      email: 'teacher.access@opennota.local',
      passwordHash: 'not-a-real-hash',
      firstName: 'Test',
      lastName: 'Teacher',
      role: 'TEACHER',
      teacherProfile: { create: { bio: 'Access control test teacher' } },
    },
    include: { teacherProfile: true },
  });
  const teacherProfile = teacherUser.teacherProfile;
  if (teacherProfile === null) {
    throw new Error('Teacher profile was not created');
  }
  // The teacher is assigned to class A's subject only.
  await prisma.teacherSubject.create({
    data: { teacherId: teacherProfile.id, subjectId: subjectA.id, isLead: true },
  });

  const studentUserA = await prisma.user.create({
    data: {
      email: 'student.a@opennota.local',
      passwordHash: 'not-a-real-hash',
      firstName: 'Ana',
      lastName: 'Alumna',
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
  const studentUserB = await prisma.user.create({
    data: {
      email: 'student.b@opennota.local',
      passwordHash: 'not-a-real-hash',
      firstName: 'Beto',
      lastName: 'Alumno',
      role: 'STUDENT',
      studentProfile: {
        create: {
          nationalId: '99000002',
          studentNumber: '2026-9002',
          birthDate: new Date('2012-06-01'),
        },
      },
    },
    include: { studentProfile: true },
  });
  const studentProfileA = studentUserA.studentProfile;
  const studentProfileB = studentUserB.studentProfile;
  if (studentProfileA === null || studentProfileB === null) {
    throw new Error('Student profiles were not created');
  }

  await prisma.enrollment.create({
    data: {
      studentId: studentProfileA.id,
      classGroupId: classGroupA.id,
      academicYearId: academicYear.id,
    },
  });
  await prisma.enrollment.create({
    data: {
      studentId: studentProfileB.id,
      classGroupId: classGroupB.id,
      academicYearId: academicYear.id,
    },
  });

  const guardianUser = await prisma.user.create({
    data: {
      email: 'guardian.access@opennota.local',
      passwordHash: 'not-a-real-hash',
      firstName: 'Gabriela',
      lastName: 'Tutora',
      role: 'GUARDIAN',
      guardianProfile: { create: { relationship: 'Madre' } },
    },
    include: { guardianProfile: true },
  });
  const guardianProfile = guardianUser.guardianProfile;
  if (guardianProfile === null) {
    throw new Error('Guardian profile was not created');
  }
  // The guardian is linked to student A only.
  await prisma.studentGuardian.create({
    data: { guardianId: guardianProfile.id, studentId: studentProfileA.id, isPrimary: true },
  });

  ids.teacherUserId = teacherUser.id;
  ids.subjectAId = subjectA.id;
  ids.subjectBId = subjectB.id;
  ids.studentAUserId = studentUserA.id;
  ids.studentAProfileId = studentProfileA.id;
  ids.studentBUserId = studentUserB.id;
  ids.studentBProfileId = studentProfileB.id;
  ids.guardianUserId = guardianUser.id;
}

describe('AccessControlService (integration)', () => {
  beforeAll(async () => {
    applySchema();
    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    await prisma.$connect();
    await seedDataset();
    // The service only uses PrismaClient members, so the real client stands
    // in for PrismaService directly.
    access = new AccessControlService(prisma as unknown as PrismaService);
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

  it('treats ADMIN and PRINCIPAL as staff, others as scoped', () => {
    expect(access.isStaff('ADMIN')).toBe(true);
    expect(access.isStaff('PRINCIPAL')).toBe(true);
    expect(access.isStaff('TEACHER')).toBe(false);
    expect(access.isStaff('STUDENT')).toBe(false);
    expect(access.isStaff('GUARDIAN')).toBe(false);
  });

  it('lets a teacher manage only their assigned subjects', async () => {
    const teacher = payload(ids.teacherUserId, 'TEACHER');
    expect(await access.canManageSubject(teacher, ids.subjectAId)).toBe(true);
    expect(await access.canManageSubject(teacher, ids.subjectBId)).toBe(false);
  });

  it('lets staff manage any subject and rejects students', async () => {
    expect(await access.canManageSubject(payload('admin', 'ADMIN'), ids.subjectBId)).toBe(true);
    expect(await access.canManageSubject(payload('principal', 'PRINCIPAL'), ids.subjectBId)).toBe(
      true,
    );
    expect(
      await access.canManageSubject(payload(ids.studentAUserId, 'STUDENT'), ids.subjectAId),
    ).toBe(false);
  });

  it('assertCanManageSubject throws for a subject the teacher does not teach', async () => {
    const teacher = payload(ids.teacherUserId, 'TEACHER');
    await expect(access.assertCanManageSubject(teacher, ids.subjectBId)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(access.assertCanManageSubject(teacher, ids.subjectAId)).resolves.toBeUndefined();
  });

  it('lists the subject ids a teacher is assigned to', async () => {
    expect(await access.teacherSubjectIds(ids.teacherUserId)).toEqual([ids.subjectAId]);
  });

  it('lets a student view only their own academic data', async () => {
    const studentA = payload(ids.studentAUserId, 'STUDENT');
    expect(await access.canViewStudent(studentA, ids.studentAProfileId)).toBe(true);
    expect(await access.canViewStudent(studentA, ids.studentBProfileId)).toBe(false);
  });

  it('lets a guardian view only their linked students', async () => {
    const guardian = payload(ids.guardianUserId, 'GUARDIAN');
    expect(await access.canViewStudent(guardian, ids.studentAProfileId)).toBe(true);
    expect(await access.canViewStudent(guardian, ids.studentBProfileId)).toBe(false);
  });

  it('lets a teacher view only students in class groups they teach', async () => {
    const teacher = payload(ids.teacherUserId, 'TEACHER');
    expect(await access.canViewStudent(teacher, ids.studentAProfileId)).toBe(true);
    expect(await access.canViewStudent(teacher, ids.studentBProfileId)).toBe(false);
  });

  it('lets staff view any student', async () => {
    const admin = payload('admin', 'ADMIN');
    expect(await access.canViewStudent(admin, ids.studentAProfileId)).toBe(true);
    expect(await access.canViewStudent(admin, ids.studentBProfileId)).toBe(true);
  });

  it('lists the student ids a teacher may read', async () => {
    expect(await access.teacherStudentIds(ids.teacherUserId)).toEqual([ids.studentAProfileId]);
  });
});
