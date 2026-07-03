import { S3Client } from '@aws-sdk/client-s3';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const S3_CLIENT = 'S3_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: S3_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const endpoint = config.get<string>('S3_ENDPOINT');
        return new S3Client({
          region: config.get<string>('S3_REGION') ?? 'us-east-1',
          // endpoint set → MinIO/S3-compatible; unset → real AWS
          endpoint: endpoint || undefined,
          forcePathStyle: config.get<boolean>('S3_FORCE_PATH_STYLE') ?? true,
          credentials: {
            accessKeyId: config.get<string>('S3_ACCESS_KEY') ?? 'minioadmin',
            secretAccessKey:
              config.get<string>('S3_SECRET_KEY') ?? 'minioadmin',
          },
        });
      },
    },
  ],
  exports: [S3_CLIENT],
})
export class S3Module {}
