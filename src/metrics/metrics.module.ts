import { Global, Module } from '@nestjs/common';
import {
  makeCounterProvider,
  makeGaugeProvider,
  PrometheusModule,
} from '@willsoto/nestjs-prometheus';
import { QueueMetricsService } from './queue-metrics.service';

// Core value-prop metric: how many listings the freshness filter accepted vs.
// rejected as zombie/stale, broken down by source. accepted = passed (score >=
// 60 and written to Postgres); rejected = routed to the DLQ.
export const jobsScrapedCounterProvider = makeCounterProvider({
  name: 'jobs_scraped_total',
  help: 'Job listings processed by the scraper by source and outcome',
  labelNames: ['source', 'outcome'],
});

// BullMQ queue depth by queue and state (waiting/active/completed/failed/
// delayed), refreshed on an interval by QueueMetricsService.
export const bullmqJobsGaugeProvider = makeGaugeProvider({
  name: 'bullmq_jobs',
  help: 'BullMQ job counts by queue and state',
  labelNames: ['queue', 'state'],
});

@Global()
@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: { enabled: true },
    }),
  ],
  providers: [
    jobsScrapedCounterProvider,
    bullmqJobsGaugeProvider,
    QueueMetricsService,
  ],
  exports: [jobsScrapedCounterProvider],
})
export class MetricsModule {}
