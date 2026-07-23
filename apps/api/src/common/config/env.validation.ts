import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.string().default('3001'),
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(10),
  // Accepts a single URL or comma-separated list of URLs
  FRONTEND_URL: z.string().optional().default('http://localhost:3000'),

  // SMTP configuration for email notifications
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().optional().default('noreply@ifh-one.com'),
  // Comma-separated list of CC email addresses for workflow notifications
  NOTIFICATION_CC_EMAILS: z.string().optional().default(''),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>) {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    console.error('❌ Invalid environment variables:', result.error.format());
    process.exit(1);
  }

  return result.data;
}
