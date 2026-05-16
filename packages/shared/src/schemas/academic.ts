import { z } from 'zod';
import { EDUCATION_LEVELS, TERM_TYPES } from '../enums';
import { idSchema, isoDateSchema } from './common';

const termFields = z.object({
  academicYearId: idSchema,
  name: z.string().min(1).max(80),
  type: z.enum(TERM_TYPES),
  number: z.number().int().min(1).max(12),
  startDate: isoDateSchema,
  endDate: isoDateSchema,
});

export const createTermSchema = termFields.refine((value) => value.endDate > value.startDate, {
  message: 'endDate must be after startDate',
  path: ['endDate'],
});
export type CreateTermInput = z.infer<typeof createTermSchema>;

export const updateTermSchema = termFields.partial().omit({ academicYearId: true });
export type UpdateTermInput = z.infer<typeof updateTermSchema>;

export const createClassGroupSchema = z.object({
  academicYearId: idSchema,
  name: z.string().min(1).max(80),
  level: z.enum(EDUCATION_LEVELS),
  year: z.number().int().min(1).max(13),
  section: z.string().min(1).max(8),
});
export type CreateClassGroupInput = z.infer<typeof createClassGroupSchema>;

export const updateClassGroupSchema = createClassGroupSchema.partial().omit({
  academicYearId: true,
});
export type UpdateClassGroupInput = z.infer<typeof updateClassGroupSchema>;

export const createSubjectSchema = z.object({
  classGroupId: idSchema,
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'color must be a hex value such as #2563eb')
    .optional(),
});
export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;

export const updateSubjectSchema = createSubjectSchema.partial().omit({ classGroupId: true });
export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;

export const assignTeacherSchema = z.object({
  teacherId: idSchema,
  subjectId: idSchema,
  isLead: z.boolean().default(false),
});
export type AssignTeacherInput = z.infer<typeof assignTeacherSchema>;
