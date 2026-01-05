import { S3 } from 'aws-sdk';
import { config } from './secrets';
import { decryptJSON } from '../utils/encryption';

/**
 * Message template structure
 */
export interface MessageTemplate {
  day: number;
  channel: string;
  region: string;
  subject?: string;
  body: string;
  variables: string[];
}

/**
 * Config bundle structure (encrypted)
 */
export interface ConfigBundle {
  templates: MessageTemplate[];
  keywords: {
    success: string[];
    failure: string[];
  };
  metadata: {
    version: string;
    lastUpdated: string;
  };
}

/**
 * S3 Client
 */
let s3Client: S3 | null = null;

function getS3Client(): S3 {
  if (!s3Client) {
    s3Client = new S3({
      region: config.aws.region,
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
    });
  }
  return s3Client;
}

/**
 * Load encrypted config bundle from S3
 */
export async function loadConfigFromS3(): Promise<ConfigBundle> {
  try {
    const s3 = getS3Client();
    
    const params = {
      Bucket: config.aws.s3BucketName,
      Key: config.aws.s3ConfigKey,
    };

    console.log(`📦 Loading config from S3: ${params.Bucket}/${params.Key}`);
    
    const result = await s3.getObject(params).promise();
    
    if (!result.Body) {
      throw new Error('Empty response from S3');
    }

    const encryptedData = result.Body.toString('utf-8');
    
    // Decrypt the JSON data
    const decryptedConfig = decryptJSON<ConfigBundle>(encryptedData);
    
    console.log('✅ Config loaded and decrypted successfully');
    return decryptedConfig;
  } catch (error) {
    console.error('❌ Failed to load config from S3:', error);
    
    // Return mock data for development/testing
    return getMockConfig();
  }
}

/**
 * Mock config for local development (when S3 is not available)
 */
export function getMockConfig(): ConfigBundle {
  console.warn('⚠️  Using mock configuration (S3 not available)');
  
  return {
    templates: [
      {
        day: 0,
        channel: 'email',
        region: 'US',
        subject: 'Initial Contact',
        body: 'Hello {{customerName}}, we are reaching out regarding {{topic}}.',
        variables: ['customerName', 'topic'],
      },
      {
        day: 2,
        channel: 'email',
        region: 'US',
        subject: 'Follow-up',
        body: 'Hi {{customerName}}, just following up on our previous message.',
        variables: ['customerName'],
      },
      {
        day: 7,
        channel: 'email',
        region: 'US',
        subject: 'Final Notice',
        body: 'This is our final attempt to reach you, {{customerName}}.',
        variables: ['customerName'],
      },
    ],
    keywords: {
      success: ['yes', 'ok', 'confirmed', 'done', 'approved', 'interested'],
      failure: ['no', 'stop', 'cancel', 'unsubscribe'],
    },
    metadata: {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
    },
  };
}

/**
 * Cache for loaded config
 */
let cachedConfig: ConfigBundle | null = null;

/**
 * Get config (with caching)
 */
export async function getConfigBundle(): Promise<ConfigBundle> {
  if (!cachedConfig) {
    cachedConfig = await loadConfigFromS3();
  }
  return cachedConfig;
}

/**
 * Find template by day, channel, and region
 */
export function findTemplate(
  config: ConfigBundle,
  day: number,
  channel: string,
  region: string
): MessageTemplate | undefined {
  return config.templates.find(
    (t) => t.day === day && t.channel === channel && t.region === region
  );
}
