
import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1),
  DATABASE_SSL: z.enum(['true', 'false']).default('false'),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('10m'),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  COOKIE_NAME: z.string().default('autolux_refresh'),
  COOKIE_DOMAIN: z.string().optional().default(''),
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  RESEND_API_KEY: z.string().optional().default(''),
  CONTACT_INBOX_EMAIL: z.string().email().or(z.literal('')).default(''),
  EMAIL_FROM: z.string().default('AutoLux <no-reply@example.com>'),
  TWILIO_ACCOUNT_SID: z.string().optional().default(''),
  TWILIO_AUTH_TOKEN: z.string().optional().default(''),
  TWILIO_VERIFY_SERVICE_SID: z.string().optional().default(''),
  ADMIN_SETUP_TOKEN: z.string().min(24)
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}
export const env = {
  ...parsed.data,
  isProduction: parsed.data.NODE_ENV === 'production',
  databaseSsl: parsed.data.DATABASE_SSL === 'true'
};
