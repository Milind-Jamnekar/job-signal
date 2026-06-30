import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class EnrichmentService implements OnModuleInit {
  private readonly logger = new Logger(EnrichmentService.name);

  constructor(@InjectQueue('enrich') private readonly enrichQueue: Queue) {}

  async onModuleInit() {
    await this.enrichQueue.add(
      'relay',
      {},
      { repeat: { every: 30_000 }, jobId: 'enrich-relay' },
    );
    this.logger.log('Enrichment relay scheduled (every 30s)');
  }
}
