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
  JWT_SECRET: Joi.string().required(),
  TELEGRAM_BOT_TOKEN: Joi.string().optional(),
  TELEGRAM_CHAT_ID: Joi.string().optional(),
});
