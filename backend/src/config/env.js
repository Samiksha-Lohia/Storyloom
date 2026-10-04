import dotenv from 'dotenv';
import Joi from 'joi';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Define validation schema for environment variables
const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
    PORT: Joi.number().default(5000),
    MONGO_URI: Joi.string().required().description('MongoDB connection URI'),
    REDIS_URL: Joi.string().required().description('Redis URL'),
    JWT_ACCESS_SECRET: Joi.string().required().description('JWT Access Token secret key'),
    JWT_REFRESH_SECRET: Joi.string().required().description('JWT Refresh Token secret key'),
    JWT_ACCESS_EXPIRY: Joi.string().default('15m').description('JWT Access Token expiration time'),
    JWT_REFRESH_EXPIRY: Joi.string().default('7d').description('JWT Refresh Token expiration time'),
    MAX_FILE_SIZE_MB: Joi.number().default(15).description('Max uploaded file size in Megabytes'),
    UPLOAD_DIR: Joi.string().default('uploads/').description('Upload directory path'),
    ALLOWED_MIME_TYPES: Joi.string()
      .default('application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain')
      .description('Comma-separated allowed MIME types for uploads'),
    STORAGE_PROVIDER: Joi.string().valid('local', 's3').default('local'),
    AWS_ACCESS_KEY_ID: Joi.string().when('STORAGE_PROVIDER', {
      is: 's3',
      then: Joi.required(),
      otherwise: Joi.optional().allow(''),
    }),
    AWS_SECRET_ACCESS_KEY: Joi.string().when('STORAGE_PROVIDER', {
      is: 's3',
      then: Joi.required(),
      otherwise: Joi.optional().allow(''),
    }),
    AWS_REGION: Joi.string().default('us-east-1'),
    AWS_S3_BUCKET_NAME: Joi.string().when('STORAGE_PROVIDER', {
      is: 's3',
      then: Joi.required(),
      otherwise: Joi.optional().allow(''),
    }),
    OPENROUTER_API_KEY_1: Joi.string().required().allow('').description('OpenRouter API Key 1'),
    OPENROUTER_API_KEY_2: Joi.string().required().allow('').description('OpenRouter API Key 2'),
    OPENROUTER_API_KEY_3: Joi.string().required().allow('').description('OpenRouter API Key 3'),
    OPENROUTER_MODEL_1: Joi.string().default('google/gemini-2.5-flash').description('OpenRouter Model 1'),
    OPENROUTER_MODEL_2: Joi.string().default('google/gemini-2.5-flash').description('OpenRouter Model 2'),
    OPENROUTER_MODEL_3: Joi.string().default('google/gemini-2.5-flash').description('OpenRouter Model 3'),
    OPENROUTER_MAX_TOKENS: Joi.number().integer().default(4096).description('OpenRouter Max Tokens'),
    CORS_ORIGIN: Joi.string().optional().allow('').description('Comma-separated allowed origins for CORS'),
    CLOUDINARY_CLOUD_NAME: Joi.string().when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.optional().allow(''),
    }).description('Cloudinary Cloud Name'),
    CLOUDINARY_API_KEY: Joi.string().when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.optional().allow(''),
    }).description('Cloudinary API Key'),
    CLOUDINARY_API_SECRET: Joi.string().when('NODE_ENV', {
      is: 'production',
      then: Joi.required(),
      otherwise: Joi.optional().allow(''),
    }).description('Cloudinary API Secret'),
    ADMIN_EMAIL: Joi.string().optional().allow('').description('Admin email for initial seed'),
    ADMIN_PASSWORD: Joi.string().optional().allow('').description('Admin password for initial seed'),
  })
  .unknown();

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  throw new Error(`Environment validation error: ${error.message}`);
}

const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  mongoose: {
    get url() {
      return process.env.MONGO_URI || envVars.MONGO_URI;
    },
  },
  redis: {
    url: envVars.REDIS_URL,
  },
  jwt: {
    accessSecret: envVars.JWT_ACCESS_SECRET,
    refreshSecret: envVars.JWT_REFRESH_SECRET,
    accessExpiry: envVars.JWT_ACCESS_EXPIRY,
    refreshExpiry: envVars.JWT_REFRESH_EXPIRY,
  },
  file: {
    maxSizeBytes: envVars.MAX_FILE_SIZE_MB * 1024 * 1024,
    uploadDir: path.resolve(envVars.UPLOAD_DIR),
    allowedTypes: envVars.ALLOWED_MIME_TYPES.split(','),
  },
  storage: {
    provider: envVars.STORAGE_PROVIDER,
    s3: {
      accessKeyId: envVars.AWS_ACCESS_KEY_ID,
      secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY,
      region: envVars.AWS_REGION,
      bucketName: envVars.AWS_S3_BUCKET_NAME,
    },
  },
  corsAllowedOrigins: (() => {
    const corsOrigin = envVars.CORS_ORIGIN;
    if (!corsOrigin) {
      return '*';
    }
    const origins = corsOrigin.split(',').map((o) => o.trim());
    if (origins.includes('*')) {
      return '*';
    }
    return origins;
  })(),
  ai: {
    provider: 'openrouter',
    openrouter: {
      apiKey1: envVars.OPENROUTER_API_KEY_1,
      apiKey2: envVars.OPENROUTER_API_KEY_2,
      apiKey3: envVars.OPENROUTER_API_KEY_3,
      model1: envVars.OPENROUTER_MODEL_1,
      model2: envVars.OPENROUTER_MODEL_2,
      model3: envVars.OPENROUTER_MODEL_3,
      maxTokens: envVars.OPENROUTER_MAX_TOKENS,
    },
  },
  cloudinary: {
    cloudName: envVars.CLOUDINARY_CLOUD_NAME || '',
    apiKey: envVars.CLOUDINARY_API_KEY || '',
    apiSecret: envVars.CLOUDINARY_API_SECRET || '',
  },
  admin: {
    email: envVars.ADMIN_EMAIL || '',
    password: envVars.ADMIN_PASSWORD || '',
  },
};

export default config;
