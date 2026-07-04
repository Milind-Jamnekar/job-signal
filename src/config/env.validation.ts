import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_URL: Joi.string().default('redis://localhost:6379'),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  BULL_BOARD_USER: Joi.string().default('admin'),
  BULL_BOARD_PASS: Joi.string().default('admin'),
  // Grace period on SIGTERM: how long /health/ready reports not-ready before
  // resources are released, so a load balancer can drain first. 0 = no delay
  // (dev/test); set to a few seconds in prod behind a proxy.
  SHUTDOWN_GRACE_MS: Joi.number().default(0),
  JWT_SECRET: Joi.string().required(),
  TELEGRAM_BOT_TOKEN: Joi.string().optional(),
  TELEGRAM_CHAT_ID: Joi.string().optional(),
  // S3 / MinIO for streaming exports (Layer 5). Defaults match local MinIO.
  S3_ENDPOINT: Joi.string().optional(), // e.g. http://localhost:9000 for MinIO; unset for real AWS
  S3_REGION: Joi.string().default('us-east-1'),
  S3_EXPORT_BUCKET: Joi.string().default('job-exports'),
  S3_ACCESS_KEY: Joi.string().default('minioadmin'),
  S3_SECRET_KEY: Joi.string().default('minioadmin'),
  S3_FORCE_PATH_STYLE: Joi.boolean().default(true), // path-style required by MinIO
});
