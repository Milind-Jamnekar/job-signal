import { Inject, Injectable } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';

@Injectable()
export class RedisHealthIndicator {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  // PING the shared ioredis client. Wrapped in a timeout because ioredis will
  // sit in its reconnect loop when Redis is unreachable — without this the
  // probe would hang instead of failing fast.
  async isHealthy(
    key: string,
    timeoutMs = 2000,
  ): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    try {
      // A resolved PING means the connection is live; a down Redis rejects
      // (or times out below) and falls through to the catch.
      await this.withTimeout(this.redis.ping(), timeoutMs);
      return indicator.up();
    } catch (error) {
      return indicator.down({ message: (error as Error).message });
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`redis ping timed out after ${ms}ms`)),
          ms,
        ),
      ),
    ]);
  }
}
