import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
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
  providers: [FreshnessScorer, RemoteOkSource, ScraperWorker, ScrapingService],
})
export class ScrapingModule {}
