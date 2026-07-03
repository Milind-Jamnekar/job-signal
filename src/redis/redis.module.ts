import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis, { Redis } from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new IORedis(
          config.get<string>('REDIS_URL') ?? 'redis://localhost:6379',
        ),
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  // Quit the shared client on shutdown so TypeORM/BullMQ aren't the only things
  // released by app.close() — otherwise the socket lingers (Jest open handle).
  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
