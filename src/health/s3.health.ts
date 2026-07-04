import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { S3_CLIENT } from '../s3/s3.module';

@Injectable()
export class S3HealthIndicator {
  constructor(
    @Inject(S3_CLIENT) private readonly s3: S3Client,
    private readonly config: ConfigService,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  // HEAD the export bucket. abortSignal caps the check so the SDK's retry/backoff
  // can't stretch a probe out for many seconds when the endpoint is down.
  async isHealthy(
    key: string,
    timeoutMs = 2000,
  ): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    const bucket = this.config.get<string>('S3_EXPORT_BUCKET') ?? 'job-exports';
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: bucket }), {
        abortSignal: AbortSignal.timeout(timeoutMs),
      });
      return indicator.up({ bucket });
    } catch (error) {
      return indicator.down({ bucket, message: (error as Error).message });
    }
  }
}
