import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new IORedis(config.get<string>('REDIS_URL') ?? 'redis://localhost:6379'),
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
