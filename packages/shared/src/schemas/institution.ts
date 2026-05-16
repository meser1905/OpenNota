import { z } from 'zod';
import { idSchema, isoDateSchema } from './common';

export const createInstitutionSchema = z.object({
  name: z.string().min(2).max(160),
  taxId: z.string().max(40).optional(),
  address: z.string().max(240).optional(),
  phone: z.string().max(40).optional(),
  email: z.string().email().optional(),
});
export type CreateInstitutionInput = z.infer<typeof createInstitutionSchema>;

export const updateInstitutionSchema = createInstitutionSchema.partial();
export type UpdateInstitutionInput = z.infer<typeof updateInstitutionSchema>;

const academicYearFields = z.object({
  institutionId: idSchema,
  year: z.number().int().min(2000).max(2100),
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  isActive: z.boolean().default(false),
});

export const createAcademicYearSchema = academicYearFields.refine(
  (value) => value.endDate > value.startDate,
  { message: 'endDate must be after startDate', path: ['endDate'] },
);
export type CreateAcademicYearInput = z.infer<typeof createAcademicYearSchema>;

export const updateAcademicYearSchema = academicYearFields.partial().omit({ institutionId: true });
export type UpdateAcademicYearInput = z.infer<typeof updateAcademicYearSchema>;
