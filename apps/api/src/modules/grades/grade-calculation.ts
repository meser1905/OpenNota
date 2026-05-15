import {
  CONCEPTUAL_GRADE_VALUES,
  type ConceptualGrade,
  conceptualGradeFromNumeric,
  type EvaluationType,
} from '@opennota/shared';

/** Internal scale (0-10) every grade is normalized to before being combined. */
export const NORMALIZED_MAX = 10;

/** Term average at or above which a subject is considered passed. */
export const PASS_THRESHOLD = 6;

export interface CalculationEvaluation {
  id: string;
  type: EvaluationType;
  /** Relative weight of this evaluation within its type. */
  weight: number;
  /** Maximum attainable raw score, used to normalize onto the 0-10 scale. */
  maxScore: number;
}

export interface CalculationGrade {
  evaluationId: string;
  numericValue: number | null;
  conceptualValue: string | null;
  wasAbsent: boolean;
}

export interface CalculationWeightConfig {
  examWeight: number;
  assignmentWeight: number;
  performanceWeight: number;
  oralWeight: number;
  projectWeight: number;
}

export interface TermAverageResult {
  /** Final term average on the 0-10 scale, rounded to two decimals. */
  average: number;
  conceptualAverage: ConceptualGrade | null;
  passed: boolean;
  /** False when the student has no usable grades for the subject yet. */
  hasGrades: boolean;
  gradedEvaluations: number;
  totalEvaluations: number;
}

const TYPE_WEIGHT_KEYS: Record<EvaluationType, keyof CalculationWeightConfig> = {
  EXAM: 'examWeight',
  ASSIGNMENT: 'assignmentWeight',
  PERFORMANCE: 'performanceWeight',
  ORAL: 'oralWeight',
  PROJECT: 'projectWeight',
};

/**
 * Normalizes one grade onto the 0-10 scale, or returns `null` when the grade
 * carries no usable score (not graded yet). An absent student scores 0.
 */
export function normalizeGrade(
  grade: CalculationGrade,
  evaluation: CalculationEvaluation,
): number | null {
  if (grade.wasAbsent) {
    return 0;
  }
  if (grade.conceptualValue !== null) {
    return CONCEPTUAL_GRADE_VALUES[grade.conceptualValue as ConceptualGrade];
  }
  if (grade.numericValue !== null) {
    if (evaluation.maxScore <= 0) {
      return null;
    }
    const normalized = (grade.numericValue / evaluation.maxScore) * NORMALIZED_MAX;
    return Math.max(0, Math.min(NORMALIZED_MAX, normalized));
  }
  return null;
}

/**
 * Computes a student's term average for one subject.
 *
 * Each graded evaluation is normalized to 0-10 and averaged within its type
 * using the per-evaluation weights. The type averages are then combined using
 * the GradingWeightConfig. Only evaluation types the student actually has
 * grades for take part, and their configured weights are renormalized to sum
 * to 100 — so the result stays meaningful mid-term. With no config, the
 * present types are weighted equally.
 */
export function computeTermAverage(
  evaluations: CalculationEvaluation[],
  grades: CalculationGrade[],
  config: CalculationWeightConfig | null,
): TermAverageResult {
  const gradeByEvaluation = new Map(grades.map((grade) => [grade.evaluationId, grade]));
  const typeTotals = new Map<EvaluationType, { weightedSum: number; weight: number }>();
  let gradedEvaluations = 0;

  for (const evaluation of evaluations) {
    const grade = gradeByEvaluation.get(evaluation.id);
    if (grade === undefined) {
      continue;
    }
    const score = normalizeGrade(grade, evaluation);
    if (score === null) {
      continue;
    }
    gradedEvaluations += 1;
    const evaluationWeight = evaluation.weight > 0 ? evaluation.weight : 1;
    const totals = typeTotals.get(evaluation.type) ?? { weightedSum: 0, weight: 0 };
    totals.weightedSum += score * evaluationWeight;
    totals.weight += evaluationWeight;
    typeTotals.set(evaluation.type, totals);
  }

  if (typeTotals.size === 0) {
    return {
      average: 0,
      conceptualAverage: null,
      passed: false,
      hasGrades: false,
      gradedEvaluations: 0,
      totalEvaluations: evaluations.length,
    };
  }

  const typeAverages = new Map<EvaluationType, number>();
  for (const [type, totals] of typeTotals) {
    typeAverages.set(type, totals.weight > 0 ? totals.weightedSum / totals.weight : 0);
  }

  let configuredWeightSum = 0;
  for (const type of typeAverages.keys()) {
    configuredWeightSum += config ? config[TYPE_WEIGHT_KEYS[type]] : 1;
  }

  let average = 0;
  if (configuredWeightSum > 0) {
    for (const [type, typeAverage] of typeAverages) {
      const typeWeight = config ? config[TYPE_WEIGHT_KEYS[type]] : 1;
      average += typeAverage * (typeWeight / configuredWeightSum);
    }
  } else {
    // Every present type has a configured weight of zero: fall back to an
    // equal split so a real set of grades never collapses to zero.
    let sum = 0;
    for (const typeAverage of typeAverages.values()) {
      sum += typeAverage;
    }
    average = sum / typeAverages.size;
  }

  const rounded = Math.round(average * 100) / 100;
  return {
    average: rounded,
    conceptualAverage: conceptualGradeFromNumeric(rounded),
    passed: rounded >= PASS_THRESHOLD,
    hasGrades: true,
    gradedEvaluations,
    totalEvaluations: evaluations.length,
  };
}
