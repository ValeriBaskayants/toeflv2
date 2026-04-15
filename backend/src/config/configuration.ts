import { z } from 'zod';

// 1. Описываем схему валидации
const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // База данных
  DATABASE_URL: z.string().url(),

  // Auth & JWT
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('7d'),
  ADMIN_PASSWORD: z.string(),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_CALLBACK_URL: z.string().url(),

  // Security & CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  THROTTLE_TTL: z.coerce.number().default(60),
  THROTTLE_LIMIT: z.coerce.number().default(120),
});

export default () => {
  // 2. Валидируем process.env
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.format());
    throw new Error('Invalid environment variables');
  }

  // 3. Возвращаем типизированный объект
  return {
    port: parsed.data.PORT,
    nodeEnv: parsed.data.NODE_ENV,
    database: {
      url: parsed.data.DATABASE_URL,
    },
    jwt: {
      secret: parsed.data.JWT_SECRET,
      expiresIn: parsed.data.JWT_EXPIRES_IN,
    },
    google: {
      clientId: parsed.data.GOOGLE_CLIENT_ID,
      clientSecret: parsed.data.GOOGLE_CLIENT_SECRET,
      callbackUrl: parsed.data.GOOGLE_CALLBACK_URL,
    },
    adminPassword: parsed.data.ADMIN_PASSWORD,
    corsOrigin: parsed.data.CORS_ORIGIN,
    throttle: {
      ttl: parsed.data.THROTTLE_TTL,
      limit: parsed.data.THROTTLE_LIMIT,
    },
  };
};