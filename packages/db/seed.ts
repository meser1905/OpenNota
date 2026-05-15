/**
 * Database seed for OpenNota.
 *
 * Populates a realistic Spanish-language data set for "Colegio San Martín":
 * one institution, the 2026 academic year with three trimesters, two class
 * groups, eight subjects, five teachers, thirty students with guardians, plus
 * sample evaluations and grades in the first trimester.
 *
 * The script is idempotent: it clears every table before inserting, so it can
 * be run repeatedly. Enum-like values are written as plain strings to mirror
 * the enums in @opennota/shared without coupling the seed to its build output.
 *
 * Test accounts (documented in the README):
 *   admin@opennota.local     / Admin123!
 *   principal@opennota.local / Principal123!
 *   teacher1..5@opennota.local / Teacher123!
 *   student1..30@opennota.local / Student123!
 *   guardian1..30@opennota.local / Guardian123!
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const BCRYPT_COST = 12;

/** Small deterministic PRNG so seeded grades are stable across runs. */
let randomState = 0x2f6e2b1;
function random(): number {
  randomState = (randomState * 1664525 + 1013904223) % 0x100000000;
  return randomState / 0x100000000;
}

const STUDENT_FIRST_NAMES = [
  'Mateo',
  'Sofía',
  'Benjamín',
  'Valentina',
  'Lucas',
  'Isabella',
  'Martín',
  'Catalina',
  'Tomás',
  'Emma',
  'Joaquín',
  'Julieta',
  'Santiago',
  'Renata',
  'Felipe',
  'Antonella',
  'Agustín',
  'Delfina',
  'Bruno',
  'Mía',
  'Thiago',
  'Victoria',
  'Lorenzo',
  'Florencia',
  'Gael',
  'Camila',
  'Dante',
  'Josefina',
  'Ignacio',
  'Pilar',
];
const SURNAMES = [
  'Gómez',
  'Díaz',
  'Romero',
  'Sosa',
  'Torres',
  'Ruiz',
  'Flores',
  'Benítez',
  'Acosta',
  'Medina',
  'Herrera',
  'Aguirre',
  'Vega',
  'Castro',
  'Rojas',
  'Molina',
  'Silva',
  'Cabrera',
  'Ramos',
  'Núñez',
];
const GUARDIAN_FIRST_NAMES = [
  'Patricia',
  'Jorge',
  'Mónica',
  'Roberto',
  'Verónica',
  'Sergio',
  'Andrea',
  'Marcelo',
  'Gabriela',
  'Fernando',
];

const SUBJECT_BLUEPRINT = [
  { name: 'Matemática', color: '#2563eb', description: 'Álgebra y geometría de tercer año.' },
  { name: 'Lengua', color: '#db2777', description: 'Lengua y literatura en español.' },
  { name: 'Historia', color: '#d97706', description: 'Historia contemporánea.' },
  { name: 'Biología', color: '#16a34a', description: 'Biología celular y humana.' },
];

function pick<T>(items: readonly T[], index: number): T {
  const value = items[index % items.length];
  if (value === undefined) {
    throw new Error('Seed name pool is empty');
  }
  return value;
}

async function clearDatabase(): Promise<void> {
  await prisma.termAverage.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.evaluation.deleteMany();
  await prisma.gradingWeightConfig.deleteMany();
  await prisma.studentGuardian.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.teacherSubject.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.classGroup.deleteMany();
  await prisma.term.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.teacherProfile.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.guardianProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.institution.deleteMany();
}

async function main(): Promise<void> {
  console.log('🌱 Seeding the OpenNota database...');
  await clearDatabase();

  const [adminHash, principalHash, teacherHash, studentHash, guardianHash] = await Promise.all([
    bcrypt.hash('Admin123!', BCRYPT_COST),
    bcrypt.hash('Principal123!', BCRYPT_COST),
    bcrypt.hash('Teacher123!', BCRYPT_COST),
    bcrypt.hash('Student123!', BCRYPT_COST),
    bcrypt.hash('Guardian123!', BCRYPT_COST),
  ]);

  // --- Institution, academic year and terms ------------------------------
  const institution = await prisma.institution.create({
    data: {
      name: 'Colegio San Martín',
      taxId: '30-12345678-9',
      address: 'Av. Libertador 1250, Ciudad',
      phone: '+54 11 4000-1000',
      email: 'contacto@colegiosanmartin.edu',
    },
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

  const termRanges = [
    { name: 'Primer Trimestre', start: '2026-03-01', end: '2026-06-07' },
    { name: 'Segundo Trimestre', start: '2026-06-08', end: '2026-09-13' },
    { name: 'Tercer Trimestre', start: '2026-09-14', end: '2026-12-15' },
  ];
  const terms = [];
  for (let i = 0; i < termRanges.length; i++) {
    const range = pick(termRanges, i);
    terms.push(
      await prisma.term.create({
        data: {
          academicYearId: academicYear.id,
          name: range.name,
          type: 'TRIMESTER',
          number: i + 1,
          startDate: new Date(range.start),
          endDate: new Date(range.end),
        },
      }),
    );
  }
  const firstTerm = pick(terms, 0);

  // --- Staff users -------------------------------------------------------
  await prisma.user.create({
    data: {
      email: 'admin@opennota.local',
      passwordHash: adminHash,
      firstName: 'Ana',
      lastName: 'Administradora',
      role: 'ADMIN',
    },
  });
  await prisma.user.create({
    data: {
      email: 'principal@opennota.local',
      passwordHash: principalHash,
      firstName: 'Pablo',
      lastName: 'Director',
      role: 'PRINCIPAL',
    },
  });

  const teacherBlueprint = [
    { firstName: 'María', lastName: 'González' },
    { firstName: 'Carlos', lastName: 'Rodríguez' },
    { firstName: 'Laura', lastName: 'Martínez' },
    { firstName: 'Diego', lastName: 'Fernández' },
    { firstName: 'Sofía', lastName: 'López' },
  ];
  const teachers = [];
  for (let i = 0; i < teacherBlueprint.length; i++) {
    const info = pick(teacherBlueprint, i);
    const user = await prisma.user.create({
      data: {
        email: `teacher${i + 1}@opennota.local`,
        passwordHash: teacherHash,
        firstName: info.firstName,
        lastName: info.lastName,
        role: 'TEACHER',
        teacherProfile: {
          create: { bio: `Docente de ${SUBJECT_BLUEPRINT[i % 4]?.name ?? 'aula'}.` },
        },
      },
      include: { teacherProfile: true },
    });
    teachers.push(user);
  }

  // --- Class groups and subjects ----------------------------------------
  const classGroups = [];
  for (const section of ['A', 'B']) {
    classGroups.push(
      await prisma.classGroup.create({
        data: {
          academicYearId: academicYear.id,
          name: `3ro ${section}`,
          level: 'SECONDARY',
          year: 3,
          section,
        },
      }),
    );
  }

  /** Subject rows with their lead teacher index, indexed for grade seeding. */
  const subjects: Array<{ id: string; classGroupId: string; leadTeacherIndex: number }> = [];
  for (const group of classGroups) {
    for (let s = 0; s < SUBJECT_BLUEPRINT.length; s++) {
      const blueprint = pick(SUBJECT_BLUEPRINT, s);
      const subject = await prisma.subject.create({
        data: {
          classGroupId: group.id,
          name: blueprint.name,
          description: blueprint.description,
          color: blueprint.color,
        },
      });
      subjects.push({ id: subject.id, classGroupId: group.id, leadTeacherIndex: s });
    }
  }

  // --- Teacher/subject assignments --------------------------------------
  for (const subject of subjects) {
    const lead = teachers[subject.leadTeacherIndex]?.teacherProfile;
    if (lead) {
      await prisma.teacherSubject.create({
        data: { teacherId: lead.id, subjectId: subject.id, isLead: true },
      });
    }
  }
  // Teacher 5 co-teaches the first Matemática and the second Lengua group.
  const teacherFive = teachers[4]?.teacherProfile;
  if (teacherFive) {
    const mathA = subjects.find((s) => s.leadTeacherIndex === 0);
    const lenguaB = subjects.filter((s) => s.leadTeacherIndex === 1)[1];
    for (const subject of [mathA, lenguaB]) {
      if (subject) {
        await prisma.teacherSubject.create({
          data: { teacherId: teacherFive.id, subjectId: subject.id, isLead: false },
        });
      }
    }
  }

  // --- Students, enrollments, guardians ---------------------------------
  /** Per-student base ability, used to make seeded grades look realistic. */
  const studentRecords: Array<{ id: string; classGroupId: string; ability: number }> = [];
  for (let i = 0; i < 30; i++) {
    const group = i < 15 ? classGroups[0] : classGroups[1];
    if (!group) {
      throw new Error('Class groups were not created');
    }
    const lastName = pick(SURNAMES, i);
    const studentUser = await prisma.user.create({
      data: {
        email: `student${i + 1}@opennota.local`,
        passwordHash: studentHash,
        firstName: pick(STUDENT_FIRST_NAMES, i),
        lastName,
        role: 'STUDENT',
        studentProfile: {
          create: {
            nationalId: String(45_000_000 + i),
            studentNumber: `2026-${String(i + 1).padStart(4, '0')}`,
            birthDate: new Date(2012, i % 12, ((i * 7) % 27) + 1),
          },
        },
      },
      include: { studentProfile: true },
    });
    const studentProfile = studentUser.studentProfile;
    if (!studentProfile) {
      throw new Error('Student profile was not created');
    }

    await prisma.enrollment.create({
      data: {
        studentId: studentProfile.id,
        classGroupId: group.id,
        academicYearId: academicYear.id,
      },
    });

    const guardianUser = await prisma.user.create({
      data: {
        email: `guardian${i + 1}@opennota.local`,
        passwordHash: guardianHash,
        firstName: pick(GUARDIAN_FIRST_NAMES, i),
        lastName,
        role: 'GUARDIAN',
        guardianProfile: {
          create: {
            nationalId: String(20_000_000 + i),
            relationship: i % 2 === 0 ? 'Madre' : 'Padre',
          },
        },
      },
      include: { guardianProfile: true },
    });
    const guardianProfile = guardianUser.guardianProfile;
    if (guardianProfile) {
      await prisma.studentGuardian.create({
        data: { guardianId: guardianProfile.id, studentId: studentProfile.id, isPrimary: true },
      });
    }

    studentRecords.push({
      id: studentProfile.id,
      classGroupId: group.id,
      ability: 5 + random() * 4,
    });
  }

  // --- Grading weights, evaluations and grades for the first trimester --
  const evaluationBlueprint = [
    { title: 'Examen Parcial 1', type: 'EXAM', date: '2026-04-10' },
    { title: 'Trabajo Práctico 1', type: 'ASSIGNMENT', date: '2026-05-08' },
    { title: 'Lección Oral', type: 'ORAL', date: '2026-05-29' },
  ];

  let evaluationCount = 0;
  let gradeCount = 0;
  for (const subject of subjects) {
    await prisma.gradingWeightConfig.create({
      data: {
        subjectId: subject.id,
        termId: firstTerm.id,
        examWeight: 40,
        assignmentWeight: 25,
        performanceWeight: 15,
        oralWeight: 10,
        projectWeight: 10,
      },
    });

    const leadTeacher = teachers[subject.leadTeacherIndex];
    const leadProfile = leadTeacher?.teacherProfile;
    if (!leadTeacher || !leadProfile) {
      continue;
    }
    const groupStudents = studentRecords.filter((s) => s.classGroupId === subject.classGroupId);

    for (const blueprint of evaluationBlueprint) {
      const evaluation = await prisma.evaluation.create({
        data: {
          subjectId: subject.id,
          termId: firstTerm.id,
          teacherId: leadProfile.id,
          title: blueprint.title,
          type: blueprint.type,
          date: new Date(blueprint.date),
          scale: 'NUMERIC_1_10',
          maxScore: 10,
          minScore: 1,
          passingScore: 6,
          weight: 1,
          isPublished: true,
        },
      });
      evaluationCount++;

      for (const student of groupStudents) {
        const wasAbsent = random() < 0.05;
        const rawValue = student.ability + (random() * 4 - 2);
        const numericValue = wasAbsent ? null : Math.min(10, Math.max(1, Math.round(rawValue)));
        await prisma.grade.create({
          data: {
            evaluationId: evaluation.id,
            studentId: student.id,
            numericValue,
            wasAbsent,
            gradedById: leadTeacher.id,
          },
        });
        gradeCount++;
      }
    }
  }

  console.log('✅ Seed complete:');
  console.log(`   1 institution, 1 academic year, ${terms.length} terms`);
  console.log(`   ${classGroups.length} class groups, ${subjects.length} subjects`);
  console.log(`   ${teachers.length} teachers, 30 students, 30 guardians`);
  console.log(`   ${evaluationCount} evaluations, ${gradeCount} grades`);
  console.log('   Log in with admin@opennota.local / Admin123!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error('❌ Seed failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
