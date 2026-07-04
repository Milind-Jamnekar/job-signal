import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';

/**
 * Holds shutdown state and the pre-teardown grace window.
 *
 * beginDrain() is driven by the signal handler in main.ts, deliberately *before*
 * app.close() runs the Nest shutdown lifecycle. It can't live in a lifecycle hook
 * like beforeApplicationShutdown: Nest runs onModuleDestroy first, so Redis/DB
 * would already be closing by the time the grace delay ran.
 */
@Injectable()
export class GracefulShutdownService {
  private shuttingDown = false;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: Logger,
  ) {}

  get isShuttingDown(): boolean {
    return this.shuttingDown;
  }

  // Flip readiness to not-ready and hold for the grace window so a load balancer
  // observes /health/ready failing and drains before the caller runs app.close().
  async beginDrain(signal: string): Promise<void> {
    if (this.shuttingDown) return;
    this.shuttingDown = true;

    const graceMs = this.config.get<number>('SHUTDOWN_GRACE_MS') ?? 0;
    this.logger.log(
      `Shutdown signal ${signal}: readiness now failing; ` +
        `draining ${graceMs}ms before app.close()`,
    );
    if (graceMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, graceMs));
    }
  }
}
