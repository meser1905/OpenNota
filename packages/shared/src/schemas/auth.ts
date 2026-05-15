import { z } from 'zod';
import { USER_ROLES } from '../enums';

/**
 * Password policy. The 72-byte ceiling matches bcrypt's input limit, beyond
 * which extra characters are silently ignored.
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters');

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  role: z.enum(USER_ROLES),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'A refresh token is required'),
});
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
