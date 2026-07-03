import { Injectable, NotImplementedException } from '@nestjs/common';

export interface ExportResult {
  status: 'pending' | 'ready' | 'failed';
  url?: string;
}

@Injectable()
export class ExportService {
  /**
   * Enqueues a BullMQ export job and returns its jobId.
   * Step 2 wires the export queue + producer here.
   */
  enqueue(_userId: string): Promise<{ jobId: string }> {
    return Promise.reject(
      new NotImplementedException(
        'Export queue not wired yet (Layer 5, step 2)',
      ),
    );
  }

  /**
   * Polls Redis under `export:{jobId}` for the presigned URL.
   * Step 2 wires the Redis read here.
   */
  getResult(_jobId: string): Promise<ExportResult> {
    return Promise.reject(
      new NotImplementedException(
        'Export result lookup not wired yet (Layer 5, step 2)',
      ),
    );
  }
}
