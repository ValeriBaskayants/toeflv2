import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  REDIS_HOST:z.string(),
  REDIS_PORT:z.coerce.number().default(6379),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('15m'),
  ADMIN_PASSWORD: z.string(),
  REFRESH_EXPIRES_DAYS: z.coerce.number().default(7),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_CALLBACK_URL: z.string().url(),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  THROTTLE_TTL: z.coerce.number().default(60),
  THROTTLE_LIMIT: z.coerce.number().default(120),
});

export default () => {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.format());
    throw new Error('Invalid environment variables');
  }

  const d = parsed.data;

  return {
    port: d.PORT,
    nodeEnv: d.NODE_ENV,
    database: { url: d.DATABASE_URL },
    jwt: {
      secret: d.JWT_SECRET,
      expiresIn: d.JWT_EXPIRES_IN,
      refreshDays: d.REFRESH_EXPIRES_DAYS,
    },
    google: {
      clientId: d.GOOGLE_CLIENT_ID,
      clientSecret: d.GOOGLE_CLIENT_SECRET,
      callbackUrl: d.GOOGLE_CALLBACK_URL,
    },
    adminPassword: d.ADMIN_PASSWORD,
    corsOrigin: d.CORS_ORIGIN,
    throttle: {
      ttl: d.THROTTLE_TTL,
      limit: d.THROTTLE_LIMIT,
    },
    redis:{
      host:d.REDIS_HOST,
      port:d.REDIS_PORT
    }
  };
};