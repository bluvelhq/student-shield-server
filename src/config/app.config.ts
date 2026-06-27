export default () => ({
  app: {
    name: process.env.APP_NAME || 'appName',
    env: process.env.APP_ENV || 'appEnv',
    url: process.env.APP_URL || 'appUrl',
    port: process.env.APP_PORT || 4000,
    requestTimeout: Number(process.env.REQUEST_TIMEOUT) || 4000,
  },
  databse: {
    url: process.env.DATABASE_URL || 'url',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'refreshSecret',
    expirationTime: process.env.JWT_EXPIRATION_TIME || 'expirationTime',
    refreshExpirationTime:
      process.env.JWT_REFRESH_EXPIRATION_TIME || 'refreshExpirationTime',
  },
  supabase: {
    projectId: process.env.SUPABASE_PROJECT_ID || 'projectId',
    publishableKey: process.env.SUPABSE_PUBLISHABLE_KEY || 'publishableKey',
    secretKey: process.env.SUPABASE_SECRET_KEY || 'secretKey',
    anonPublicKey: process.env.SUPABASE_ANON_PUBLIC_KEY || 'anonPublicKey',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'serviceRoleKey',
    baseUrl: process.env.SUPABASE_BASE_URL || 'baseUrl',
  },
  arkesel: {
    apiKey: process.env.ARKESEL_API_KEY || 'apiKey',
    smsUrl: process.env.ARKESEL_SMS_URL || 'smsUrl',
  },
});
