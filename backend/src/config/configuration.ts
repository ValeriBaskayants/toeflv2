export default () => ({
  port: parseInt(process.env.PORT || '3001', 10) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/toefl_prep',
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret_change_in_production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  throttleTtl: parseInt(process.env.THROTTLE_TTL || '60', 10) || 60,
  throttleLimit: parseInt(process.env.THROTTLE_LIMIT || '120', 10) || 120,
});