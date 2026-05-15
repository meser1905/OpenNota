import { Inject, Injectable } from '@nestjs/common';
import type { CacheStore, EvaluationType } from '@opennota/shared';
import { CACHE_STORE } from '../../common/cache/cache.module';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  type CalculationEvaluation,
  computeTermAverage,
  type TermAverageResult,
} from './grade-calculation';

const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Computes and caches term averages. The pure arithmetic lives in
 * `grade-calculation.ts`; this service supplies it with database rows, caches
 * the result, and persists the materialized `TermAverage` row.
 */
@Injectable()
export class GradeCalculationService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_STORE) private readonly cache: CacheStore,
  ) {}

  private cacheKey(studentId: string, subjectId: string, termId: string): string {
    return `term-average:${studentId}:${subjectId}:${termId}`;
  }

  /** Cache-aware read of a student's term average for a subject. */
  async getTermAverage(
    studentId: string,
    subjectId: string,
    termId: string,
  ): Promise<TermAverageResult> {
    const key = this.cacheKey(studentId, subjectId, termId);
    const cached = await this.cache.get<TermAverageResult>(key);
    if (cached !== undefined) {
      return cached;
    }
    const result = await this.compute(studentId, subjectId, termId);
    await this.cache.set(key, result, CACHE_TTL_MS);
    return result;
  }

  /**
   * Recomputes the average, persists the `TermAverage` row and refreshes the
   * cache. Called by the grades module whenever a grade changes.
   */
  async recalculate(
    studentId: string,
    subjectId: string,
    termId: string,
  ): Promise<TermAverageResult> {
    const result = await this.compute(studentId, subjectId, termId);
    if (result.hasGrades) {
      await this.prisma.termAverage.upsert({
        where: { studentId_subjectId_termId: { studentId, subjectId, termId } },
        create: {
          studentId,
          subjectId,
          termId,
          average: result.average,
          conceptualAverage: result.conceptualAverage,
          passed: result.passed,
        },
        update: {
          average: result.average,
          conceptualAverage: result.conceptualAverage,
          passed: result.passed,
          lastCalculatedAt: new Date(),
        },
      });
    }
    await this.cache.set(this.cacheKey(studentId, subjectId, termId), result, CACHE_TTL_MS);
    return result;
  }

  /** Drops a cached average without recomputing it. */
  async invalidate(studentId: string, subjectId: string, termId: string): Promise<void> {
    await this.cache.delete(this.cacheKey(studentId, subjectId, termId));
  }

  private async compute(
    studentId: string,
    subjectId: string,
    termId: string,
  ): Promise<TermAverageResult> {
    const [evaluations, grades, config] = await Promise.all([
      this.prisma.evaluation.findMany({
        where: { subjectId, termId, isPublished: true, deletedAt: null },
        select: { id: true, type: true, weight: true, maxScore: true },
      }),
      this.prisma.grade.findMany({
        where: { studentId, evaluation: { subjectId, termId } },
        select: { evaluationId: true, numericValue: true, conceptualValue: true, wasAbsent: true },
      }),
      this.prisma.gradingWeightConfig.findUnique({
        where: { subjectId_termId: { subjectId, termId } },
      }),
    ]);

    const calcEvaluations: CalculationEvaluation[] = evaluations.map((evaluation) => ({
      id: evaluation.id,
      type: evaluation.type as EvaluationType,
      weight: evaluation.weight,
      maxScore: evaluation.maxScore,
    }));
    return computeTermAverage(calcEvaluations, grades, config);
  }
}
