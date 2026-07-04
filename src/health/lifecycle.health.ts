import { Injectable } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { GracefulShutdownService } from './graceful-shutdown.service';

@Injectable()
export class LifecycleHealthIndicator {
  constructor(
    private readonly shutdown: GracefulShutdownService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  // Reports down once shutdown has begun so the readiness probe fails and the
  // load balancer stops routing before the process actually closes.
  isHealthy(key: string): HealthIndicatorResult {
    const indicator = this.healthIndicatorService.check(key);
    return this.shutdown.isShuttingDown
      ? indicator.down({ message: 'application is shutting down' })
      : indicator.up();
  }
}
