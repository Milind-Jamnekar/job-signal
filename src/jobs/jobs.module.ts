import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BullBoardModule } from '@bull-board/nestjs';
import { Job } from '../entities/job.entity';
import { EXPORT_QUEUE, ExportService } from './export.service';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job]),
    BullModule.registerQueue({ name: EXPORT_QUEUE }),
    BullBoardModule.forFeature({ name: EXPORT_QUEUE, adapter: BullMQAdapter }),
  ],
  controllers: [JobsController],
  providers: [JobsService, ExportService],
  exports: [JobsService],
})
export class JobsModule {}
