import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Environment variable schema
 */
interface AppConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  aws: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    s3BucketName: string;
    s3ConfigKey: string;
  };
  encryption: {
    key: string;
  };
  webhook: {
    url: string;
    secret: string;
  };
  smtp: {
    host: string;
    port: number;
    user: string;
    password: string;
  };
  twilio: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
  };
  app: {
    nodeEnv: string;
    logLevel: string;
    maxJobAttempts: number;
    jobTimeoutMs: number;
  };
}

/**
 * Required environment variables
 */
const requiredVars = [
    'REDIS_HOST',
  'N8N_WEBHOOK_URL',
  'ENCRYPTION_KEY',
];

/**
 * Validate required environment variables
 */
export function validateEnv(): void {
  const missing: string[] = [];

  // Check required vars
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  // Check Redis configuration - must have REDIS_URL OR REDIS_HOST
  if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
    missing.push('REDIS_URL or REDIS_HOST');
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  console.log('✅ Environment variables validated');
}

/**
 * Get application configuration
 */
export function getConfig(): AppConfig {
  return {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0', 10),
    },
    aws: {
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      s3BucketName: process.env.S3_BUCKET_NAME || '',
      s3ConfigKey: process.env.S3_CONFIG_KEY || 'encrypted-prompts.json',
    },
    encryption: {
      key: process.env.ENCRYPTION_KEY || '',
    },
    webhook: {
      url: process.env.N8N_WEBHOOK_URL || '',
      secret: process.env.WEBHOOK_SECRET || '',
    },
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      user: process.env.SMTP_USER || '',
      password: process.env.SMTP_PASSWORD || '',
    },
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
      phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
    },
    app: {
      nodeEnv: process.env.NODE_ENV || 'development',
      logLevel: process.env.LOG_LEVEL || 'info',
      maxJobAttempts: parseInt(process.env.MAX_JOB_ATTEMPTS || '3', 10),
      jobTimeoutMs: parseInt(process.env.JOB_TIMEOUT_MS || '300000', 10),
    },
  };
}

export const config = getConfig();
