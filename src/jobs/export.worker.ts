import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { Job as BullJob } from 'bullmq';
import * as ExcelJS from 'exceljs';
import { Redis } from 'ioredis';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PassThrough, Readable } from 'stream';
import { DataSource } from 'typeorm';
import { REDIS_CLIENT } from '../redis/redis.module';
import { S3_CLIENT } from '../s3/s3.module';
import { EXPORT_QUEUE, ExportJobData } from './export.service';

const EXPORT_TIMEOUT_MS = 300_000; // 5 min budget (BullMQ v5 has no per-job timeout)
const RESULT_TTL_SECONDS = 7200; // 2h — matches presigned URL TTL

const EXPORT_SQL = `
  SELECT j.id, j.title, c.name AS company, j.url,
         j.salary_min, j.salary_max, j.currency,
         j.freshness_score, j.source, j.posted_at, j.scraped_at
  FROM jobs j
  LEFT JOIN companies c ON c.id = j.company_id
  WHERE j.status = $1
  ORDER BY j.freshness_score DESC, j.scraped_at DESC
`;

interface ExportRow {
  id: string;
  title: string;
  company: string | null;
  url: string;
  salary_min: number | null;
  salary_max: number | null;
  currency: string;
  freshness_score: number;
  source: string;
  posted_at: Date | null;
  scraped_at: Date;
}

@Processor(EXPORT_QUEUE)
export class ExportWorker extends WorkerHost {
  constructor(
    @InjectPinoLogger(ExportWorker.name) private readonly logger: PinoLogger,
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(S3_CLIENT) private readonly s3: S3Client,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async process(job: BullJob<ExportJobData>): Promise<void> {
    const jobId = String(job.id);
    const bucket = this.config.get<string>('S3_EXPORT_BUCKET') ?? 'job-exports';
    const key = `exports/jobs-${jobId}-${Date.now()}.xlsx`;
    // NB: logger.assign() only works in HTTP request scope; a BullMQ worker runs
    // outside it, so attach context to each log call directly instead.
    const logCtx = { export_job_id: jobId, user_id: job.data.userId, key };
    this.logger.info(logCtx, 'Starting export');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    // ExcelJS streams XLSX chunks into a PassThrough that S3 uploads (multipart).
    const pass = new PassThrough();
    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: pass });
    const sheet = workbook.addWorksheet('jobs');
    sheet.columns = [
      { header: 'ID', key: 'id', width: 38 },
      { header: 'Title', key: 'title', width: 40 },
      { header: 'Company', key: 'company', width: 24 },
      { header: 'URL', key: 'url', width: 50 },
      { header: 'Salary Min', key: 'salary_min', width: 12 },
      { header: 'Salary Max', key: 'salary_max', width: 12 },
      { header: 'Currency', key: 'currency', width: 10 },
      { header: 'Score', key: 'freshness_score', width: 8 },
      { header: 'Source', key: 'source', width: 16 },
      { header: 'Posted At', key: 'posted_at', width: 22 },
      { header: 'Scraped At', key: 'scraped_at', width: 22 },
    ];

    const upload = new Upload({
      client: this.s3,
      params: {
        Bucket: bucket,
        Key: key,
        Body: pass,
        ContentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });
    const uploadDone = upload.done();

    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(
        () => reject(new Error('export timed out after 5m')),
        EXPORT_TIMEOUT_MS,
      );
    });

    const work = (async () => {
      // queryRunner.stream uses pg-query-stream → constant memory, no full result buffer
      const dbStream = (await queryRunner.stream(EXPORT_SQL, [
        'active',
      ])) as unknown as Readable;
      let rows = 0;
      for await (const row of dbStream as AsyncIterable<ExportRow>) {
        sheet.addRow(row).commit();
        rows++;
      }
      sheet.commit(); // WorksheetWriter.commit() is synchronous (returns void)
      await workbook.commit(); // finalizes XLSX and ends the PassThrough
      await uploadDone;
      return rows;
    })();

    try {
      const rows = await Promise.race([work, timeout]);
      this.logger.info({ ...logCtx, rows }, 'Export uploaded');
    } catch (err) {
      await upload.abort().catch(() => undefined);
      throw err;
    } finally {
      if (timer) clearTimeout(timer);
      await queryRunner.release();
    }

    const url = await getSignedUrl(
      this.s3,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: RESULT_TTL_SECONDS },
    );
    await this.redis.set(
      `export:${jobId}`,
      JSON.stringify({ url }),
      'EX',
      RESULT_TTL_SECONDS,
    );
    this.logger.info(logCtx, 'Export result stored');
  }
}
