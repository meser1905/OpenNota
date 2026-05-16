import type { EvaluationType } from '@opennota/shared';
import { describe, expect, it } from 'vitest';
import {
  type CalculationEvaluation,
  type CalculationGrade,
  type CalculationWeightConfig,
  computeTermAverage,
  NORMALIZED_MAX,
  normalizeGrade,
  PASS_THRESHOLD,
} from './grade-calculation';

/**
 * Unit tests for the pure term-average arithmetic in `grade-calculation.ts`.
 *
 * No database, no NestJS — every test feeds plain objects in and asserts on
 * the returned numbers. Expected values are derived by hand from the formulas
 * documented in the source.
 */

/** Builds an evaluation with sensible defaults; override only what matters. */
function evaluation(overrides: Partial<CalculationEvaluation> = {}): CalculationEvaluation {
  return {
    id: 'eval-1',
    type: 'EXAM',
    weight: 1,
    maxScore: 10,
    ...overrides,
  };
}

/** Builds a grade for an evaluation; numeric by default, no absence. */
function grade(overrides: Partial<CalculationGrade> = {}): CalculationGrade {
  return {
    evaluationId: 'eval-1',
    numericValue: null,
    conceptualValue: null,
    wasAbsent: false,
    ...overrides,
  };
}

/** A full GradingWeightConfig with every type weighted; tests override fields. */
function weightConfig(overrides: Partial<CalculationWeightConfig> = {}): CalculationWeightConfig {
  return {
    examWeight: 0,
    assignmentWeight: 0,
    performanceWeight: 0,
    oralWeight: 0,
    projectWeight: 0,
    ...overrides,
  };
}

describe('exported constants', () => {
  it('uses a 0-10 internal scale and a passing threshold of 6', () => {
    expect(NORMALIZED_MAX).toBe(10);
    expect(PASS_THRESHOLD).toBe(6);
  });
});

describe('computeTermAverage', () => {
  it('reports no grades when there are no evaluations at all', () => {
    const result = computeTermAverage([], [], null);

    expect(result.hasGrades).toBe(false);
    expect(result.average).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.totalEvaluations).toBe(0);
    expect(result.gradedEvaluations).toBe(0);
    expect(result.conceptualAverage).toBeNull();
  });

  it('reports no grades when evaluations exist but none are graded', () => {
    const evaluations = [evaluation({ id: 'e1' }), evaluation({ id: 'e2' })];

    const result = computeTermAverage(evaluations, [], null);

    expect(result.hasGrades).toBe(false);
    expect(result.average).toBe(0);
    // `totalEvaluations` still counts the published evaluations.
    expect(result.totalEvaluations).toBe(2);
    expect(result.gradedEvaluations).toBe(0);
  });

  it('computes the average for a single graded exam with no weight config', () => {
    const evaluations = [evaluation({ id: 'e1', type: 'EXAM', weight: 1, maxScore: 10 })];
    const grades = [grade({ evaluationId: 'e1', numericValue: 8 })];

    const result = computeTermAverage(evaluations, grades, null);

    expect(result.average).toBe(8);
    expect(result.passed).toBe(true);
    expect(result.hasGrades).toBe(true);
    expect(result.gradedEvaluations).toBe(1);
    expect(result.totalEvaluations).toBe(1);
    expect(result.conceptualAverage).toBe('VERY_GOOD');
  });

  it('treats an all-absent set as graded with a zero average', () => {
    const evaluations = [evaluation({ id: 'e1' }), evaluation({ id: 'e2' })];
    const grades = [
      grade({ evaluationId: 'e1', wasAbsent: true }),
      grade({ evaluationId: 'e2', wasAbsent: true }),
    ];

    const result = computeTermAverage(evaluations, grades, null);

    // An absent student scores 0, which is a real (failing) grade — not the
    // "no grades yet" state.
    expect(result.hasGrades).toBe(true);
    expect(result.average).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.gradedEvaluations).toBe(2);
  });

  it('weights evaluations within a type by their per-evaluation weight', () => {
    // Two exams: weights 1 and 3, grades 6 and 10.
    // Within-type weighted average = (6*1 + 10*3) / (1 + 3) = 36 / 4 = 9.
    const evaluations = [
      evaluation({ id: 'e1', type: 'EXAM', weight: 1, maxScore: 10 }),
      evaluation({ id: 'e2', type: 'EXAM', weight: 3, maxScore: 10 }),
    ];
    const grades = [
      grade({ evaluationId: 'e1', numericValue: 6 }),
      grade({ evaluationId: 'e2', numericValue: 10 }),
    ];

    const result = computeTermAverage(evaluations, grades, null);

    expect(result.average).toBe(9);
    expect(result.gradedEvaluations).toBe(2);
  });

  it('renormalizes config weights to the types that are actually graded', () => {
    // Config has EXAM 40 and ASSIGNMENT 25 (plus others). Only those two types
    // are graded. Type averages: EXAM 10, ASSIGNMENT 5.
    // configuredWeightSum = 40 + 25 = 65.
    // average = 10*(40/65) + 5*(25/65) = (400 + 125) / 65 = 525 / 65 = 8.0769...
    // rounded to two decimals -> 8.08.
    const config = weightConfig({
      examWeight: 40,
      assignmentWeight: 25,
      performanceWeight: 15,
      oralWeight: 10,
      projectWeight: 10,
    });
    const evaluations = [
      evaluation({ id: 'e1', type: 'EXAM', weight: 1, maxScore: 10 }),
      evaluation({ id: 'e2', type: 'ASSIGNMENT', weight: 1, maxScore: 10 }),
    ];
    const grades = [
      grade({ evaluationId: 'e1', numericValue: 10 }),
      grade({ evaluationId: 'e2', numericValue: 5 }),
    ];

    const result = computeTermAverage(evaluations, grades, config);

    expect(result.average).toBe(8.08);
    expect(result.passed).toBe(true);
  });

  it('weights every present type equally when there is no config', () => {
    // EXAM type average 8, ASSIGNMENT type average 4. With no config each type
    // weighs 1, so average = (8 + 4) / 2 = 6.
    const evaluations = [
      evaluation({ id: 'e1', type: 'EXAM', weight: 1, maxScore: 10 }),
      evaluation({ id: 'e2', type: 'ASSIGNMENT', weight: 1, maxScore: 10 }),
    ];
    const grades = [
      grade({ evaluationId: 'e1', numericValue: 8 }),
      grade({ evaluationId: 'e2', numericValue: 4 }),
    ];

    const result = computeTermAverage(evaluations, grades, null);

    expect(result.average).toBe(6);
    expect(result.passed).toBe(true);
  });

  it('normalizes evaluations on different raw scales onto 0-10', () => {
    // maxScore 100, grade 80 -> 8. maxScore 10, grade 9 -> 9. Same type (EXAM),
    // equal per-evaluation weight: within-type average = (8 + 9) / 2 = 8.5.
    const evaluations = [
      evaluation({ id: 'e1', type: 'EXAM', weight: 1, maxScore: 100 }),
      evaluation({ id: 'e2', type: 'EXAM', weight: 1, maxScore: 10 }),
    ];
    const grades = [
      grade({ evaluationId: 'e1', numericValue: 80 }),
      grade({ evaluationId: 'e2', numericValue: 9 }),
    ];

    const result = computeTermAverage(evaluations, grades, null);

    expect(result.average).toBe(8.5);
  });

  it('maps a conceptual grade onto its numeric value', () => {
    // A single GOOD conceptual grade -> 6.
    const evaluations = [evaluation({ id: 'e1', type: 'ORAL', weight: 1, maxScore: 10 })];
    const grades = [grade({ evaluationId: 'e1', conceptualValue: 'GOOD' })];

    const result = computeTermAverage(evaluations, grades, null);

    expect(result.average).toBe(6);
    expect(result.passed).toBe(true);
    expect(result.conceptualAverage).toBe('GOOD');
  });

  it('passes when the average is exactly at the threshold', () => {
    const evaluations = [evaluation({ id: 'e1', type: 'EXAM', weight: 1, maxScore: 10 })];
    const grades = [grade({ evaluationId: 'e1', numericValue: PASS_THRESHOLD })];

    const result = computeTermAverage(evaluations, grades, null);

    expect(result.average).toBe(PASS_THRESHOLD);
    expect(result.passed).toBe(true);
  });

  it('fails when the average is just below the threshold', () => {
    // maxScore 10, grade 5.9 -> 5.9, below the threshold of 6.
    const evaluations = [evaluation({ id: 'e1', type: 'EXAM', weight: 1, maxScore: 10 })];
    const grades = [grade({ evaluationId: 'e1', numericValue: 5.9 })];

    const result = computeTermAverage(evaluations, grades, null);

    expect(result.average).toBe(5.9);
    expect(result.passed).toBe(false);
  });

  it('rounds the final average to two decimal places', () => {
    // Three exams 7, 8, 8 with equal weight -> 23 / 3 = 7.666... -> 7.67.
    const evaluations = [
      evaluation({ id: 'e1', type: 'EXAM', weight: 1, maxScore: 10 }),
      evaluation({ id: 'e2', type: 'EXAM', weight: 1, maxScore: 10 }),
      evaluation({ id: 'e3', type: 'EXAM', weight: 1, maxScore: 10 }),
    ];
    const grades = [
      grade({ evaluationId: 'e1', numericValue: 7 }),
      grade({ evaluationId: 'e2', numericValue: 8 }),
      grade({ evaluationId: 'e3', numericValue: 8 }),
    ];

    const result = computeTermAverage(evaluations, grades, null);

    expect(result.average).toBe(7.67);
  });

  it('ignores grades that reference no published evaluation', () => {
    const evaluations = [evaluation({ id: 'e1', type: 'EXAM', weight: 1, maxScore: 10 })];
    const grades = [
      grade({ evaluationId: 'e1', numericValue: 9 }),
      // This grade points at an evaluation not in the list — must be skipped.
      grade({ evaluationId: 'ghost', numericValue: 1 }),
    ];

    const result = computeTermAverage(evaluations, grades, null);

    expect(result.average).toBe(9);
    expect(result.gradedEvaluations).toBe(1);
  });

  it('skips an ungraded evaluation but still counts a graded sibling', () => {
    const evaluations = [
      evaluation({ id: 'e1', type: 'EXAM', weight: 1, maxScore: 10 }),
      evaluation({ id: 'e2', type: 'EXAM', weight: 1, maxScore: 10 }),
    ];
    // e2 has a grade row but no usable score (not absent, all values null).
    const grades = [grade({ evaluationId: 'e1', numericValue: 7 }), grade({ evaluationId: 'e2' })];

    const result = computeTermAverage(evaluations, grades, null);

    expect(result.average).toBe(7);
    expect(result.gradedEvaluations).toBe(1);
    expect(result.totalEvaluations).toBe(2);
  });

  it('treats a non-positive per-evaluation weight as a weight of 1', () => {
    // e1 weight 0 -> coerced to 1; e2 weight 1. Grades 4 and 8 -> (4 + 8)/2 = 6.
    const evaluations = [
      evaluation({ id: 'e1', type: 'EXAM', weight: 0, maxScore: 10 }),
      evaluation({ id: 'e2', type: 'EXAM', weight: 1, maxScore: 10 }),
    ];
    const grades = [
      grade({ evaluationId: 'e1', numericValue: 4 }),
      grade({ evaluationId: 'e2', numericValue: 8 }),
    ];

    const result = computeTermAverage(evaluations, grades, null);

    expect(result.average).toBe(6);
  });

  it('falls back to an equal split when every present type has zero weight', () => {
    // Config weights all default to 0. EXAM avg 8, ASSIGNMENT avg 6 -> the
    // service must not collapse to 0; it averages equally -> (8 + 6) / 2 = 7.
    const config = weightConfig();
    const evaluations = [
      evaluation({ id: 'e1', type: 'EXAM', weight: 1, maxScore: 10 }),
      evaluation({ id: 'e2', type: 'ASSIGNMENT', weight: 1, maxScore: 10 }),
    ];
    const grades = [
      grade({ evaluationId: 'e1', numericValue: 8 }),
      grade({ evaluationId: 'e2', numericValue: 6 }),
    ];

    const result = computeTermAverage(evaluations, grades, config);

    expect(result.average).toBe(7);
  });

  it('clamps an over-max raw score to the top of the 0-10 scale', () => {
    // numericValue 15 on a maxScore of 10 would normalize to 15; it is clamped
    // back to 10.
    const evaluations = [evaluation({ id: 'e1', type: 'EXAM', weight: 1, maxScore: 10 })];
    const grades = [grade({ evaluationId: 'e1', numericValue: 15 })];

    const result = computeTermAverage(evaluations, grades, null);

    expect(result.average).toBe(10);
  });
});

describe('normalizeGrade', () => {
  it('returns 0 for an absent student regardless of any score', () => {
    expect(normalizeGrade(grade({ wasAbsent: true, numericValue: 9 }), evaluation())).toBe(0);
  });

  it('returns the raw-to-10 ratio for a numeric grade', () => {
    expect(normalizeGrade(grade({ numericValue: 80 }), evaluation({ maxScore: 100 }))).toBe(8);
    expect(normalizeGrade(grade({ numericValue: 9 }), evaluation({ maxScore: 10 }))).toBe(9);
  });

  it('returns null when the evaluation has a non-positive maxScore', () => {
    expect(normalizeGrade(grade({ numericValue: 5 }), evaluation({ maxScore: 0 }))).toBeNull();
    expect(normalizeGrade(grade({ numericValue: 5 }), evaluation({ maxScore: -1 }))).toBeNull();
  });

  it('returns null for an ungraded grade (all values null, not absent)', () => {
    expect(normalizeGrade(grade(), evaluation())).toBeNull();
  });

  it('maps each conceptual grade onto its numeric value', () => {
    expect(normalizeGrade(grade({ conceptualValue: 'EXCELLENT' }), evaluation())).toBe(10);
    expect(normalizeGrade(grade({ conceptualValue: 'VERY_GOOD' }), evaluation())).toBe(8);
    expect(normalizeGrade(grade({ conceptualValue: 'GOOD' }), evaluation())).toBe(6);
    expect(normalizeGrade(grade({ conceptualValue: 'SATISFACTORY' }), evaluation())).toBe(4);
    expect(normalizeGrade(grade({ conceptualValue: 'INSUFFICIENT' }), evaluation())).toBe(2);
  });

  it('clamps a numeric grade into the 0-10 range', () => {
    expect(normalizeGrade(grade({ numericValue: 200 }), evaluation({ maxScore: 100 }))).toBe(10);
    expect(normalizeGrade(grade({ numericValue: 0 }), evaluation({ maxScore: 10 }))).toBe(0);
  });

  it('prefers the conceptual value over a numeric value when both are set', () => {
    const mixed = grade({ conceptualValue: 'GOOD', numericValue: 10 });
    expect(normalizeGrade(mixed, evaluation({ maxScore: 10 }))).toBe(6);
  });
});

describe('evaluation type coverage', () => {
  it('combines all five evaluation types under an equal split', () => {
    const types: EvaluationType[] = ['EXAM', 'ASSIGNMENT', 'PERFORMANCE', 'ORAL', 'PROJECT'];
    const evaluations = types.map((type, index) =>
      evaluation({ id: `e${index}`, type, weight: 1, maxScore: 10 }),
    );
    // Grades 10, 8, 6, 4, 2 -> equal type split -> (10+8+6+4+2)/5 = 6.
    const grades = [10, 8, 6, 4, 2].map((value, index) =>
      grade({ evaluationId: `e${index}`, numericValue: value }),
    );

    const result = computeTermAverage(evaluations, grades, null);

    expect(result.average).toBe(6);
    expect(result.gradedEvaluations).toBe(5);
  });
});
