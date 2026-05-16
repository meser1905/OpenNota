import { z } from 'zod';
import { EVALUATION_TYPES, GRADE_SCALES } from '../enums';
import { idSchema, isoDateSchema } from './common';

const evaluationFields = z.object({
  subjectId: idSchema,
  termId: idSchema,
  title: z.string().min(2).max(160),
  description: z.string().max(1000).optional(),
  type: z.enum(EVALUATION_TYPES),
  date: isoDateSchema,
  weight: z.number().positive().max(100).default(1),
  scale: z.enum(GRADE_SCALES),
  maxScore: z.number().positive().max(1000).default(10),
  minScore: z.number().min(0).default(1),
  passingScore: z.number().min(0).default(6),
  isPublished: z.boolean().default(false),
});

function evaluationBoundsAreValid(value: {
  minScore: number;
  maxScore: number;
  passingScore: number;
}): boolean {
  return (
    value.maxScore > value.minScore &&
    value.passingScore >= value.minScore &&
    value.passingScore <= value.maxScore
  );
}

export const createEvaluationSchema = evaluationFields.refine(evaluationBoundsAreValid, {
  message: 'Scores must satisfy minScore < maxScore and minScore <= passingScore <= maxScore',
  path: ['passingScore'],
});
export type CreateEvaluationInput = z.infer<typeof createEvaluationSchema>;

export const updateEvaluationSchema = evaluationFields
  .partial()
  .omit({ subjectId: true, termId: true });
export type UpdateEvaluationInput = z.infer<typeof updateEvaluationSchema>;

const TOTAL_WEIGHT = 100;
const WEIGHT_TOLERANCE = 0.001;

const gradingWeightFields = z.object({
  subjectId: idSchema,
  termId: idSchema,
  examWeight: z.number().min(0).max(100),
  assignmentWeight: z.number().min(0).max(100),
  performanceWeight: z.number().min(0).max(100),
  oralWeight: z.number().min(0).max(100),
  projectWeight: z.number().min(0).max(100),
});

function weightsSumTo100(value: {
  examWeight: number;
  assignmentWeight: number;
  performanceWeight: number;
  oralWeight: number;
  projectWeight: number;
}): boolean {
  const sum =
    value.examWeight +
    value.assignmentWeight +
    value.performanceWeight +
    value.oralWeight +
    value.projectWeight;
  return Math.abs(sum - TOTAL_WEIGHT) < WEIGHT_TOLERANCE;
}

export const createGradingWeightConfigSchema = gradingWeightFields.refine(weightsSumTo100, {
  message: 'Evaluation type weights must sum to 100',
  path: ['examWeight'],
});
export type CreateGradingWeightConfigInput = z.infer<typeof createGradingWeightConfigSchema>;

export const updateGradingWeightConfigSchema = gradingWeightFields
  .omit({ subjectId: true, termId: true })
  .refine(weightsSumTo100, {
    message: 'Evaluation type weights must sum to 100',
    path: ['examWeight'],
  });
export type UpdateGradingWeightConfigInput = z.infer<typeof updateGradingWeightConfigSchema>;
