
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(12).max(128),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phoneE164: z.string().regex(/^\+[1-9]\d{7,14}$/).optional(),
  preferredLanguage: z.enum(['en','de','fr','ar']).default('en'),
  dateOfBirth: z.string().date().optional(),
  addressLine1: z.string().trim().max(160).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().length(2).optional(),
  postalCode: z.string().trim().max(20).optional()
});
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128)
});
export const tokenSchema = z.object({ token: z.string().min(32).max(256) });
export const resetSchema = z.object({
  token: z.string().min(32).max(256),
  password: z.string().min(12).max(128)
});
export const googleSchema = z.object({ idToken: z.string().min(20) });
