/**
 * Domain enumerations.
 *
 * SQLite has no native `enum` type, so these values are persisted as plain
 * strings. They are declared here once and reused by the API, the database
 * seed and the UI, giving the whole system a single source of truth. Zod
 * schemas in `../schemas` refine the matching string columns against them.
 */

export const USER_ROLES = ['ADMIN', 'PRINCIPAL', 'TEACHER', 'STUDENT', 'GUARDIAN'] as const;
export type UserRole = (typeof USER_ROLES)[number];
export const UserRole = {
  ADMIN: 'ADMIN',
  PRINCIPAL: 'PRINCIPAL',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
  GUARDIAN: 'GUARDIAN',
} as const satisfies Record<string, UserRole>;

export const TERM_TYPES = ['TRIMESTER', 'QUARTER', 'BIMESTER'] as const;
export type TermType = (typeof TERM_TYPES)[number];
export const TermType = {
  TRIMESTER: 'TRIMESTER',
  QUARTER: 'QUARTER',
  BIMESTER: 'BIMESTER',
} as const satisfies Record<string, TermType>;

export const EDUCATION_LEVELS = ['KINDERGARTEN', 'PRIMARY', 'SECONDARY'] as const;
export type EducationLevel = (typeof EDUCATION_LEVELS)[number];
export const EducationLevel = {
  KINDERGARTEN: 'KINDERGARTEN',
  PRIMARY: 'PRIMARY',
  SECONDARY: 'SECONDARY',
} as const satisfies Record<string, EducationLevel>;

export const EVALUATION_TYPES = ['EXAM', 'ASSIGNMENT', 'PERFORMANCE', 'ORAL', 'PROJECT'] as const;
export type EvaluationType = (typeof EVALUATION_TYPES)[number];
export const EvaluationType = {
  EXAM: 'EXAM',
  ASSIGNMENT: 'ASSIGNMENT',
  PERFORMANCE: 'PERFORMANCE',
  ORAL: 'ORAL',
  PROJECT: 'PROJECT',
} as const satisfies Record<string, EvaluationType>;

export const GRADE_SCALES = ['NUMERIC_1_10', 'NUMERIC_1_100', 'CONCEPTUAL', 'PERCENTAGE'] as const;
export type GradeScale = (typeof GRADE_SCALES)[number];
export const GradeScale = {
  NUMERIC_1_10: 'NUMERIC_1_10',
  NUMERIC_1_100: 'NUMERIC_1_100',
  CONCEPTUAL: 'CONCEPTUAL',
  PERCENTAGE: 'PERCENTAGE',
} as const satisfies Record<string, GradeScale>;

/**
 * Conceptual grades used by evaluations on the `CONCEPTUAL` scale. Each maps
 * to a 0-10 numeric value so conceptual results can be averaged and, if
 * needed, rendered back as a concept by `conceptualGradeFromNumeric`.
 */
export const CONCEPTUAL_GRADES = [
  'EXCELLENT',
  'VERY_GOOD',
  'GOOD',
  'SATISFACTORY',
  'INSUFFICIENT',
] as const;
export type ConceptualGrade = (typeof CONCEPTUAL_GRADES)[number];

export const CONCEPTUAL_GRADE_VALUES: Record<ConceptualGrade, number> = {
  EXCELLENT: 10,
  VERY_GOOD: 8,
  GOOD: 6,
  SATISFACTORY: 4,
  INSUFFICIENT: 2,
};

/** Maps a 0-10 numeric value back onto the closest conceptual grade. */
export function conceptualGradeFromNumeric(value: number): ConceptualGrade {
  let closest: ConceptualGrade = 'INSUFFICIENT';
  let smallestDistance = Number.POSITIVE_INFINITY;
  for (const grade of CONCEPTUAL_GRADES) {
    const distance = Math.abs(CONCEPTUAL_GRADE_VALUES[grade] - value);
    if (distance < smallestDistance) {
      smallestDistance = distance;
      closest = grade;
    }
  }
  return closest;
}
