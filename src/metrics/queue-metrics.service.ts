import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Queue } from 'bullmq';
import { Gauge } from 'prom-client';

const QUEUE_NAMES = ['scrape', 'scrape-dlq', 'enrich', 'notify', 'export'];
const STATES = ['waiting', 'active', 'completed', 'failed', 'delayed'] as const;
const REFRESH_MS = 10_000;

// Exposes BullMQ queue depth as a Prometheus gauge (bullmq_jobs{queue,state}).
// Uses its own lightweight read-only Queue handles (getJobCounts only) rather
// than injecting the app's queues, so it stays decoupled from the workers.
@Injectable()
export class QueueMetricsService implements OnModuleInit, OnModuleDestroy {
  private queues: Queue[] = [];
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly config: ConfigService,
    @InjectMetric('bullmq_jobs') private readonly gauge: Gauge<string>,
  ) {}

  onModuleInit(): void {
    const connection = {
      host: this.config.get<string>('REDIS_HOST') ?? 'localhost',
      port: this.config.get<number>('REDIS_PORT') ?? 6379,
    };
    this.queues = QUEUE_NAMES.map((name) => new Queue(name, { connection }));
    this.timer = setInterval(() => void this.collect(), REFRESH_MS);
    void this.collect();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    await Promise.all(this.queues.map((q) => q.close()));
  }

  private async collect(): Promise<void> {
    for (const queue of this.queues) {
      try {
        const counts = await queue.getJobCounts(...STATES);
        for (const state of STATES) {
          this.gauge.set({ queue: queue.name, state }, counts[state] ?? 0);
        }
      } catch {
        // Redis blip — skip this cycle; the next tick retries.
      }
    }
  }
}
