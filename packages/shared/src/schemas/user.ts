import { z } from 'zod';
import { USER_ROLES } from '../enums';
import { passwordSchema } from './auth';
import { idSchema, isoDateSchema } from './common';

export const createUserSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  role: z.enum(USER_ROLES),
  isActive: z.boolean().default(true),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const createStudentProfileSchema = z.object({
  userId: idSchema,
  nationalId: z.string().min(3).max(40),
  birthDate: isoDateSchema,
  studentNumber: z.string().min(1).max(40),
});
export type CreateStudentProfileInput = z.infer<typeof createStudentProfileSchema>;

export const createTeacherProfileSchema = z.object({
  userId: idSchema,
  bio: z.string().max(500).optional(),
});
export type CreateTeacherProfileInput = z.infer<typeof createTeacherProfileSchema>;

export const createGuardianProfileSchema = z.object({
  userId: idSchema,
  nationalId: z.string().min(3).max(40).optional(),
  relationship: z.string().min(2).max(60),
});
export type CreateGuardianProfileInput = z.infer<typeof createGuardianProfileSchema>;

export const enrollStudentSchema = z.object({
  studentId: idSchema,
  classGroupId: idSchema,
  academicYearId: idSchema,
});
export type EnrollStudentInput = z.infer<typeof enrollStudentSchema>;

export const linkGuardianSchema = z.object({
  guardianId: idSchema,
  studentId: idSchema,
  isPrimary: z.boolean().default(false),
});
export type LinkGuardianInput = z.infer<typeof linkGuardianSchema>;
