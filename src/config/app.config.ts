export default () => ({
  app: {
    name: process.env.APP_NAME || 'appName',
    env: process.env.APP_ENV || 'appEnv',
    devClientUrl: process.env.DEV_CLIENT_URL || 'localhost:5173',
    devServerUrl: process.env.DEV_SERVER_URL || 'locahost:4000',
    port: process.env.APP_PORT || 4000,
    prodClientUrl: process.env.PROD_CLIENT_URL || 'localhost:5173',
    prodServerUrl: process.env.PROD_SERVER_URL || 'locahost:4000',
    adminSecretCode: process.env.ADMIN_SECRET_CODE || 'adminSecretCode',
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
  paystack: {
    liveSecretKey: process.env.PAYSTACK_LIVE_SECRET_KEY || 'liveSecretKey',
    livePublicKey: process.env.PAYSTACK_LIVE_PUBLIC_KEY || 'livePublicKey',
    testSecretKey: process.env.PAYSTACK_TEST_SECRET_KEY || 'testSecretKey',
    testPublicKey: process.env.PAYSTACK_TEST_PUBLIC_KEY || 'testPublicKey',
    baseUrl: process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co',
    webhookUrl: process.env.PAYSTACK_WEBHOOK_URL || 'webhookUrl',
  },
  brevo: {
    pass: process.env.BREVO_SMTP_KEY,
    port: process.env.BREVO_PORT,
    user: process.env.BREVO_USER,
    host: process.env.BREVO_HOST,
    from: process.env.MAIL_FROM,
  },
  apiNinjas: {
    apiKey: process.env.API_NINJAS_API_KEY || 'apiKey',
    baseUrl: process.env.API_NINJAS_BASE_URL || 'baseUrl',
  },
  company: {
    email: process.env.COMPANY_EMAIL,
    phone: process.env.COMPANY_PHONE,
  },
});
