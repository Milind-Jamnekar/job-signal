import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectDataSource } from '@nestjs/typeorm';
import { Job as BullJob } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { DataSource } from 'typeorm';
import { Company } from '../entities/company.entity';
import { Job } from '../entities/job.entity';
import { JobOutbox } from '../entities/job-outbox.entity';
import { getCorrelationId } from '../observability/correlation';
import { LevelsFyiSource } from './levels-fyi.source';

@Processor('enrich')
export class EnrichmentRelay extends WorkerHost {
  constructor(
    @InjectPinoLogger(EnrichmentRelay.name)
    private readonly logger: PinoLogger,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly levelsFyi: LevelsFyiSource,
  ) {
    super();
  }

  async process(job: BullJob): Promise<void> {
    const logCtx = { correlation_id: getCorrelationId(job) };
    const outboxRepo = this.dataSource.getRepository(JobOutbox);
    const companyRepo = this.dataSource.getRepository(Company);
    const jobRepo = this.dataSource.getRepository(Job);

    // SELECT FOR UPDATE SKIP LOCKED — prevents double-processing by concurrent workers
    const rows = await outboxRepo
      .createQueryBuilder('o')
      .setLock('pessimistic_partial_write')
      .where('o.processed_at IS NULL')
      .limit(50)
      .getMany();

    if (rows.length === 0) return;

    this.logger.info(
      { ...logCtx, rows: rows.length },
      'Processing outbox rows',
    );

    for (const row of rows) {
      const companyName =
        (row.payload?.companyName as string | undefined) ?? '';

      const salaryP50 = await this.levelsFyi.getSalaryP50(companyName);

      if (salaryP50 !== null) {
        await companyRepo.update({ name: companyName }, { salaryP50 });

        // Re-score job with company rating bonus (+15 now active)
        const job = await jobRepo.findOne({
          where: { id: row.jobId },
          relations: ['company'],
        });

        if (job) {
          const newScore = job.freshnessScore + 15;
          await jobRepo.update(job.id, {
            freshnessScore: Math.min(newScore, 100),
          });
        }
      }

      await outboxRepo.update(row.id, { processedAt: new Date() });
    }

    this.logger.info({ ...logCtx, rows: rows.length }, 'Enrichment relay done');
  }
}
