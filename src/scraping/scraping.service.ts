import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class ScrapingService implements OnModuleInit {
  private readonly logger = new Logger(ScrapingService.name);

  constructor(@InjectQueue('scrape') private readonly scrapeQueue: Queue) {}

  async onModuleInit() {
    await this.scrapeQueue.add(
      'scrape-remoteok',
      {},
      {
        repeat: { pattern: '0 * * * *' },
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { age: 604800 },
      },
    );
    this.logger.log('Scrape job scheduled (hourly)');
  }
}
