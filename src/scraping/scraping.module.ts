import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import IORedis from 'ioredis';
import { Company } from '../entities/company.entity';
import { Job } from '../entities/job.entity';
import { FreshnessScorer } from './freshness-scorer';
import { ScraperWorker } from './scraper.worker';
import { ScrapingService } from './scraping.service';
import { RemoteOkSource } from './sources/remote-ok.source';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'scrape' }),
    BullModule.registerQueue({ name: 'scrape-dlq' }),
    TypeOrmModule.forFeature([Job, Company]),
  ],
  providers: [
    FreshnessScorer,
    RemoteOkSource,
    ScraperWorker,
    ScrapingService,
    {
      provide: 'REDIS_CLIENT',
      useFactory: () =>
        new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379'),
    },
  ],
})
export class ScrapingModule {}
