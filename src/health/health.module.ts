import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { GracefulShutdownService } from './graceful-shutdown.service';
import { HealthController } from './health.controller';
import { LifecycleHealthIndicator } from './lifecycle.health';
import { RedisHealthIndicator } from './redis.health';
import { S3HealthIndicator } from './s3.health';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [
    RedisHealthIndicator,
    S3HealthIndicator,
    GracefulShutdownService,
    LifecycleHealthIndicator,
  ],
})
export class HealthModule {}
