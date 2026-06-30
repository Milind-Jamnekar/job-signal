import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { Company } from '../entities/company.entity';
import { Job } from '../entities/job.entity';
import { JobOutbox } from '../entities/job-outbox.entity';
import { EnrichmentRelay } from './enrichment.relay';
import { EnrichmentService } from './enrichment.service';
import { LevelsFyiSource } from './levels-fyi.source';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'enrich' }),
    BullBoardModule.forFeature({ name: 'enrich', adapter: BullMQAdapter }),
    TypeOrmModule.forFeature([Job, Company, JobOutbox]),
  ],
  providers: [LevelsFyiSource, EnrichmentRelay, EnrichmentService],
})
export class EnrichmentModule {}
