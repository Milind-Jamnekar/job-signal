import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);

  constructor(@InjectQueue('notify') private readonly notifyQueue: Queue) {}

  async onModuleInit() {
    await this.notifyQueue.add(
      'notify',
      {},
      { repeat: { pattern: '0 * * * *' }, jobId: 'notify-hourly' },
    );
    this.logger.log('Notification job scheduled (hourly)');
  }
}
