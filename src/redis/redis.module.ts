import {
  Global,
  Inject,
  Logger,
  Module,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis, { Redis } from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const logger = new Logger('RedisClient');
        const client = new IORedis(
          config.get<string>('REDIS_URL') ?? 'redis://localhost:6379',
        );
        // An 'error' listener is required — without one, ioredis emitting
        // 'error' on a connection blip would crash the process. ioredis retries
        // on its own, so log and let it reconnect.
        client.on('error', (err: Error) =>
          logger.warn(`Redis client error: ${err.message}`),
        );
        return client;
      },
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
