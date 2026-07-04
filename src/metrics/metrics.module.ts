import { Global, Module } from '@nestjs/common';
import {
  makeCounterProvider,
  PrometheusModule,
} from '@willsoto/nestjs-prometheus';

// Core value-prop metric: how many listings the freshness filter accepted vs.
// rejected as zombie/stale, broken down by source. accepted = passed (score >=
// 60 and written to Postgres); rejected = routed to the DLQ.
export const jobsScrapedCounterProvider = makeCounterProvider({
  name: 'jobs_scraped_total',
  help: 'Job listings processed by the scraper by source and outcome',
  labelNames: ['source', 'outcome'],
});

@Global()
@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: { enabled: true },
    }),
  ],
  providers: [jobsScrapedCounterProvider],
  exports: [jobsScrapedCounterProvider],
})
export class MetricsModule {}
