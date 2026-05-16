/**
 * TypeScript shapes for the OpenNota API responses.
 *
 * Derived from `packages/db/prisma/schema.prisma`. The web app must not import
 * `@opennota/db`, so these interfaces are declared here. Date columns arrive
 * over the wire as ISO 8601 strings.
 */
import type {
  ConceptualGrade,
  EducationLevel,
  EvaluationType,
  GradeScale,
  TermType,
  UserRole,
} from '@opennota/shared';

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

/** A subject as returned by `GET /subjects/mine`, with its class group joined in. */
export interface SubjectWithClassGroup extends Subject {
  classGroup: { id: string; name: string };
}

/** A graded activity. `type` is an `EvaluationType` and `scale` a `GradeScale`. */
export interface Evaluation {
  id: string;
  subjectId: string;
  termId: string;
  teacherId: string;
  title: string;
  description: string | null;
  type: EvaluationType;
  date: string;
  weight: number;
  scale: GradeScale;
  maxScore: number;
  minScore: number;
  passingScore: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** Per-subject/term weighting of the five evaluation types. */
export interface GradingWeightConfig {
  id: string;
  subjectId: string;
  termId: string;
  examWeight: number;
  assignmentWeight: number;
  performanceWeight: number;
  oralWeight: number;
  projectWeight: number;
  createdAt: string;
  updatedAt: string;
}

/** The students-by-evaluations matrix backing the grade entry sheet. */
export interface GradeSheet {
  subject: { id: string; name: string };
  evaluations: Array<{
    id: string;
    title: string;
    type: EvaluationType;
    date: string;
    scale: GradeScale;
    maxScore: number;
    passingScore: number;
    isPublished: boolean;
  }>;
  students: Array<{
    id: string;
    firstName: string;
    lastName: string;
    studentNumber: string;
  }>;
  grades: Array<{
    evaluationId: string;
    studentId: string;
    numericValue: number | null;
    conceptualValue: ConceptualGrade | null;
    wasAbsent: boolean;
    comments: string | null;
  }>;
}

/** A student whose report card the current user may view. */
export interface ReportCardStudent {
  id: string;
  firstName: string;
  lastName: string;
  studentNumber: string;
}

/** One evaluation row inside a report card subject. */
export interface ReportCardEvaluation {
  id: string;
  title: string;
  type: EvaluationType;
  date: string;
  maxScore: number;
  numericValue: number | null;
  conceptualValue: ConceptualGrade | null;
  wasAbsent: boolean;
}

/** One subject's results inside a report card. */
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

/** A student's full report card for a term, as returned by `GET /reports/report-card`. */
export interface ReportCard {
  student: ReportCardStudent;
  institution: string;
  classGroup: string | null;
  term: { name: string; type: TermType };
  academicYear: number;
  subjects: ReportCardSubject[];
  overallAverage: number;
  generatedAt: string;
}
