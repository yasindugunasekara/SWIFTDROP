import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || ''
  },
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres_password_example@localhost:5432/swiftdrop_db?schema=public',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'jwt_access_secret_sample',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'jwt_refresh_secret_sample',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },
  oauth: {
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/v1/auth/google/callback'
  },
  webhook: {
    hmacSecret: process.env.WEBHOOK_HMAC_SECRET || 'webhook_hmac_sample_secret_key'
  },
  ai: {
    apiKey: process.env.GEMINI_API_KEY || '',
    modelName: process.env.AI_MODEL_NAME || 'gemini-1.5-flash'
  }
};
