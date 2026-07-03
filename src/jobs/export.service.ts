import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';

export interface ExportResult {
  status: 'pending' | 'ready' | 'failed';
  url?: string;
}

export const EXPORT_QUEUE = 'export';

/** Payload enqueued for the streaming export worker (wired in step 2b). */
export interface ExportJobData {
  userId: string;
}

/** Shape written to Redis under `export:{jobId}` by the worker (step 2b). */
interface StoredExportResult {
  url: string;
}

@Injectable()
export class ExportService {
  constructor(
    @InjectQueue(EXPORT_QUEUE)
    private readonly exportQueue: Queue<ExportJobData>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async enqueue(userId: string): Promise<{ jobId: string }> {
    const job = await this.exportQueue.add(
      'export',
      { userId },
      {
        attempts: 1,
        removeOnComplete: { count: 100 },
        removeOnFail: { age: 604800 },
      },
    );
    return { jobId: String(job.id) };
  }

  async getResult(jobId: string): Promise<ExportResult> {
    const stored = await this.redis.get(`export:${jobId}`);
    if (stored) {
      const { url } = JSON.parse(stored) as StoredExportResult;
      return { status: 'ready', url };
    }

    const job = await this.exportQueue.getJob(jobId);
    if (job && (await job.isFailed())) {
      return { status: 'failed' };
    }
    return { status: 'pending' };
  }
}
