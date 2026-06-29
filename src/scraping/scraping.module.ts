import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
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
    BullBoardModule.forFeature(
      { name: 'scrape', adapter: BullMQAdapter },
      { name: 'scrape-dlq', adapter: BullMQAdapter },
    ),
    TypeOrmModule.forFeature([Job, Company]),
  ],
  providers: [
    FreshnessScorer,
    RemoteOkSource,
    ScraperWorker,
    ScrapingService,
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new IORedis(
          config.get<string>('REDIS_URL') ?? 'redis://localhost:6379',
        ),
    },
  ],
})
export class ScrapingModule {}
