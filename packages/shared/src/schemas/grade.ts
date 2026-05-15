import { z } from 'zod';
import { CONCEPTUAL_GRADES } from '../enums';
import { idSchema } from './common';

/** Fields a teacher can edit for a single student's grade on an evaluation. */
const gradeValueFields = z.object({
  numericValue: z.number().min(0).max(1000).nullable().optional(),
  conceptualValue: z.enum(CONCEPTUAL_GRADES).nullable().optional(),
  comments: z.string().max(1000).nullable().optional(),
  wasAbsent: z.boolean().default(false),
});

export const upsertGradeSchema = gradeValueFields.extend({
  evaluationId: idSchema,
  studentId: idSchema,
});
export type UpsertGradeInput = z.infer<typeof upsertGradeSchema>;

export const batchUpsertGradesSchema = z.object({
  evaluationId: idSchema,
  grades: z
    .array(gradeValueFields.extend({ studentId: idSchema }))
    .min(1, 'At least one grade is required'),
});
export type BatchUpsertGradesInput = z.infer<typeof batchUpsertGradesSchema>;
