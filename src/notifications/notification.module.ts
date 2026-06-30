import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { Job } from '../entities/job.entity';
import { SavedSearch } from '../entities/saved-search.entity';
import { NotificationWorker } from './notification.worker';
import { NotificationService } from './notification.service';
import { TelegramService } from './telegram.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'notify' }),
    BullBoardModule.forFeature({ name: 'notify', adapter: BullMQAdapter }),
    TypeOrmModule.forFeature([Job, SavedSearch]),
  ],
  providers: [TelegramService, NotificationWorker, NotificationService],
})
export class NotificationModule {}
