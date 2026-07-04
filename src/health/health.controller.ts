import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { RedisHealthIndicator } from './redis.health';
import { S3HealthIndicator } from './s3.health';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly redis: RedisHealthIndicator,
    private readonly s3: S3HealthIndicator,
  ) {}

  // Liveness: is the process responsive? No external deps on purpose — a DB or
  // Redis blip must not make an orchestrator kill and restart a healthy process.
  @Get('live')
  @HealthCheck()
  live() {
    return this.health.check([]);
  }

  // Readiness: should this instance receive traffic? Checks the hard deps needed
  // to serve reads/writes. S3 is excluded — exports are async/queued, so an S3
  // outage must not pull the node out of rotation for job-listing traffic.
  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 2000 }),
      () => this.redis.isHealthy('redis'),
    ]);
  }

  // Full dependency snapshot (DB + Redis + S3) for dashboards/humans. Includes
  // the soft S3 dependency; not wired to any orchestrator probe.
  @Get()
  @HealthCheck()
  full() {
    return this.health.check([
      () => this.db.pingCheck('database', { timeout: 2000 }),
      () => this.redis.isHealthy('redis'),
      () => this.s3.isHealthy('s3'),
    ]);
  }
}
